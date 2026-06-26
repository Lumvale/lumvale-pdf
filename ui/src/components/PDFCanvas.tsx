import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Bundle the pdfjs worker locally (via Vite) so rendering works fully offline
// instead of fetching it from a CDN at runtime.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

import { getPDFDocument } from '../utils/pdfCache';
import AnnotationOverlay from './AnnotationOverlay';
import type { Annotation, AnnotationType } from './AnnotationOverlay';

// Global semaphore: limit concurrent pdf.js page renders to prevent saturating
// the main thread when many pages need re-rendering simultaneously.
//
// The queue is priority-aware: high-priority requests (the large pages in the
// main viewer) are served before low-priority ones (the ~100+ sidebar
// thumbnails). Without this, after a document edit the sidebar's thumbnails —
// which mount first in the DOM — grab every slot and starve the main viewer,
// so the user sees numbers appear on the thumbnails while the main page stays
// stale for a very long time.
let renderSlots = 3;
const highPriorityQueue: Array<() => void> = [];
const lowPriorityQueue: Array<() => void> = [];

const acquireRenderSlot = (highPriority: boolean): Promise<void> => {
  if (renderSlots > 0) {
    renderSlots--;
    return Promise.resolve();
  }
  return new Promise(resolve => {
    (highPriority ? highPriorityQueue : lowPriorityQueue).push(resolve);
  });
};

const releaseRenderSlot = () => {
  const next = highPriorityQueue.shift() ?? lowPriorityQueue.shift();
  if (next) {
    next();
  } else {
    renderSlots++;
  }
};

interface PDFCanvasProps {
  documentBytes: Uint8Array;
  pageNumber: number;
  scale?: number;
  rotation?: number;
  className?: string;
  // Annotation Props
  activeAnnotationTool?: AnnotationType | null;
  activeAnnotationColor?: string;
  activeAnnotationStrokeWidth?: number;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onToolSelect?: (tool: AnnotationType | null) => void;
  /** Whether this canvas should win render slots ahead of others. The main
   *  viewer uses 'high' (the default); the sidebar thumbnails use 'low' so they
   *  never starve the page the user is actually looking at. */
  renderPriority?: 'high' | 'low';
  /** Reports the page's intrinsic (unscaled) size in PDF points once rendered.
   *  The Workspace uses this to size placeholders for virtualized pages so the
   *  scroll height stays stable. */
  onRenderedSize?: (widthPt: number, heightPt: number) => void;
  /** Display-pixel size to reserve before this page has rendered. Lets a freshly
   *  mounted (e.g. just-scrolled-into-view) canvas reserve the same space as the
   *  virtualization placeholder it replaces, avoiding a scroll jump. */
  placeholderWidth?: number;
  placeholderHeight?: number;
}

/**
 * PDFCanvas is responsible for rendering a single page of a PDF document onto an HTML canvas.
 * It uses pdf.js to extract the page data and draws it with consideration for High-DPI screens.
 * 
 * Performance:
 * - Lazy Rendering: It only renders the actual PDF graphics when the component intersects the viewport.
 * - Dimension Pre-fetching: It fetches the PDF viewport dimensions instantly even when off-screen to prevent scroll layout flickering.
 *
 * @param {PDFCanvasProps} props The properties for the canvas including document data, page number, zoom scale, and annotation states.
 */
export default function PDFCanvas({ 
  documentBytes, 
  pageNumber, 
  scale = 1.5, 
  className = "",
  activeAnnotationTool = null,
  activeAnnotationColor = '#FF0000',
  activeAnnotationStrokeWidth = 2,
  annotations = [],
  onAnnotationsChange,
  onToolSelect,
  rotation = 0,
  renderPriority = 'high',
  onRenderedSize,
  placeholderWidth,
  placeholderHeight
}: PDFCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const renderedStateRef = useRef<{ scale: number; pageNumber: number; rotation: number; documentBytes: Uint8Array } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Toggle visibility based on intersection
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { rootMargin: '400px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Pre-calculate canvas dimensions when scale changes so off-screen pages resize properly
  // without needing to do a full PDF render immediately
  useEffect(() => {
    if (renderedStateRef.current && renderedStateRef.current.scale !== scale) {
      const scaleRatio = scale / renderedStateRef.current.scale;
      setCanvasDimensions(prev => ({
        width: prev.width * scaleRatio,
        height: prev.height * scaleRatio
      }));
    }
  }, [scale]);

  useEffect(() => {
    if (!isVisible) return;
    if (
      renderedStateRef.current &&
      renderedStateRef.current.scale === scale &&
      renderedStateRef.current.pageNumber === pageNumber &&
      renderedStateRef.current.rotation === rotation &&
      renderedStateRef.current.documentBytes === documentBytes
    ) {
      return;
    }
    
    let active = true;
    let renderTask: any = null;

    // Whether this canvas already shows a (now-stale) render. When re-rendering
    // after a document edit we keep the old pixels on screen until the new
    // render is ready, instead of blanking to a placeholder — otherwise every
    // page the user isn't currently looking at flashes white and stays white.
    const isRerender = renderedStateRef.current !== null;

    const renderPage = async () => {
      let slotAcquired = false;
      try {
        // Wait for a render slot BEFORE updating state - this prevents all 107 components
        // from calling setState simultaneously, which would block the main thread and freeze scrolling.
        await acquireRenderSlot(renderPriority === 'high');
        slotAcquired = true;
        if (!active) return;

        // Only update state once we have a slot (at most 3 components at a time).
        // On a first render we show the loading/placeholder state; on a re-render
        // we leave the existing canvas visible so it doesn't flash blank.
        setError(null);
        if (!isRerender) {
          setLoading(true);
          setHasRendered(false);
        }

        const pdf = await getPDFDocument(documentBytes);

        // Ensure the component hasn't unmounted
        if (!active) return;
        
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error(`Invalid page number: ${pageNumber}`);
        }

        const page = await pdf.getPage(pageNumber);
        if (!active) return;
        
        // Determine device pixel ratio for crisp rendering on high-DPI displays
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Set up viewport and scaling
        const viewport = page.getViewport({ scale, rotation: rotation || 0 });
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        // Scale canvas backing store. Assigning width/height clears the canvas,
        // so only do it when the size actually changes — that way a same-size
        // re-render (e.g. after adding page numbers) keeps the previous pixels on
        // screen until pdf.js paints the new ones over them, with no white flash.
        const backingWidth = Math.floor(viewport.width * pixelRatio);
        const backingHeight = Math.floor(viewport.height * pixelRatio);
        if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
          canvas.width = backingWidth;
          canvas.height = backingHeight;
        }

        // Scale canvas CSS display size
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        if (active) {
          setCanvasDimensions({ width: viewport.width, height: viewport.height });
        }
        
        // Render the PDF page into the canvas context with the scaling transform
        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
        };
        
        renderTask = page.render(renderContext);
        await renderTask.promise;

        if (active && annotationLayerRef.current) {
          const annotationLayerDiv = annotationLayerRef.current;
          annotationLayerDiv.innerHTML = '';
          const annotationsData = await page.getAnnotations();
          
          // Mock link service to prevent null reference errors for links
          const mockLinkService = {
            addLinkAttributes: () => {},
            getDestinationHash: () => '',
            getAnchorUrl: () => '',
            setDocument: () => {},
            executeNamedAction: () => {},
            executeSetOCGState: () => {},
            goToDestination: () => {},
            navigateTo: () => {},
          };

          const annotationLayer = new (pdfjsLib.AnnotationLayer as any)({
            page: page,
            viewport: viewport.clone({ dontFlip: false }),
            div: annotationLayerDiv,
            linkService: mockLinkService
          });



          await annotationLayer.render({
            annotations: annotationsData,
            linkService: mockLinkService,
            downloadManager: null as any,
            renderInteractiveForms: true
          });
        }
        
        if (active) {
          setLoading(false);
          setHasRendered(true);
          renderedStateRef.current = { scale, pageNumber, rotation, documentBytes } as any;
          setCanvasDimensions({ width: viewport.width, height: viewport.height });
          // Report intrinsic page size (unscaled) so the Workspace can size
          // placeholders for off-window (virtualized) pages.
          onRenderedSize?.(viewport.width / scale, viewport.height / scale);
        }
      } catch (err: any) {
        // Ignore render cancellation errors
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering PDF:', err);
        if (active) setError(String(err));
      } finally {
        if (slotAcquired) releaseRenderSlot();
        if (active) setLoading(false);
      }
    };

    renderPage();

    return () => {
      active = false;
      // Do not cancel renderTask because it can deadlock the pdf.js worker
    };
  }, [documentBytes, pageNumber, scale, isVisible, rotation]);

  return (
    <div 
      ref={containerRef} 
      className={`relative shadow-2xl bg-white ${className}`}
      style={!hasRendered ? {
        width: canvasDimensions.width || placeholderWidth || 800 * scale,
        height: canvasDimensions.height || placeholderHeight || 1130 * scale,
        maxWidth: '100%'
      } : {
        width: canvasDimensions.width,
        height: canvasDimensions.height
      }}
    >
      {/* Skeleton / Placeholder while not visible or loading */}
      {!hasRendered && !loading && !error && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse"></div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-10">
          <div className="text-lumvale-primary animate-pulse font-bold">Rendering Canvas...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 text-[var(--color-lumvale-text)] p-4">
          Failed to render: {error}
        </div>
      )}
      <canvas ref={canvasRef} className="block" />
      <div 
        ref={annotationLayerRef} 
        className="annotationLayer absolute inset-0 pointer-events-auto"
        style={{
          width: canvasDimensions.width ? `${canvasDimensions.width}px` : '100%',
          height: canvasDimensions.height ? `${canvasDimensions.height}px` : '100%',
          '--scale-factor': scale
        } as React.CSSProperties}
      />
      {onAnnotationsChange && canvasDimensions.width > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
          <AnnotationOverlay
            pageIndex={pageNumber - 1}
            scale={scale}
            activeTool={activeAnnotationTool}
            activeColor={activeAnnotationColor}
            activeStrokeWidth={activeAnnotationStrokeWidth}
            annotations={annotations}
            onAnnotationsChange={onAnnotationsChange}
            onToolSelect={onToolSelect}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        </div>
      )}
    </div>
  );
}
