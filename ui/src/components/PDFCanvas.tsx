import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure the worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

import { getPDFDocument } from '../utils/pdfCache';
import AnnotationOverlay from './AnnotationOverlay';
import type { Annotation, AnnotationType } from './AnnotationOverlay';

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
  rotation = 0
}: PDFCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const renderedStateRef = useRef<{ scale: number; pageNumber: number } | null>(null);

  useEffect(() => {
    // Fetch dimensions immediately to prevent flicker before intersection
    let active = true;
    const fetchDimensions = async () => {
      try {
        const pdf = await getPDFDocument(documentBytes);
        if (!active) return;
        const page = await pdf.getPage(pageNumber);
        if (!active) return;
        const viewport = page.getViewport({ scale: 1.0, rotation: rotation || 0 }); // Get base dimensions
        if (active) {
          setCanvasDimensions({ 
            width: viewport.width * scale, 
            height: viewport.height * scale 
          });
        }
      } catch (err) {
        console.error('Failed to pre-fetch dimensions', err);
      }
    };
    fetchDimensions();
    return () => { active = false; };
  }, [documentBytes, pageNumber, rotation]);

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
    // If not visible, or already rendered the exact same configuration, don't do anything
    if (!isVisible) return;
    if (
      hasRendered && 
      renderedStateRef.current?.scale === scale && 
      renderedStateRef.current?.pageNumber === pageNumber &&
      (renderedStateRef.current as any)?.rotation === rotation
    ) {
      return;
    }
    
    let active = true;
    let renderTask: any = null;

    const renderPage = async () => {
      setLoading(true);
      setError(null);
      setHasRendered(false); // Reset since we are rendering a new config
      
      try {
        const pdf = await getPDFDocument(documentBytes);
        
        // Ensure the component hasn't unmounted
        if (!active) return;
        
        // Ensure page index is valid
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
        
        // Scale canvas backing store
        canvas.height = viewport.height * pixelRatio;
        canvas.width = viewport.width * pixelRatio;
        
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
          renderedStateRef.current = { scale, pageNumber, rotation } as any;
          setCanvasDimensions({ width: viewport.width, height: viewport.height });
        }
      } catch (err: any) {
        // Ignore render cancellation errors
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering PDF:', err);
        if (active) setError(String(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    renderPage();

    return () => {
      active = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [documentBytes, pageNumber, scale, isVisible, rotation, hasRendered]);

  return (
    <div 
      ref={containerRef} 
      className={`relative shadow-2xl bg-white ${className}`}
      style={!hasRendered ? { 
        width: canvasDimensions.width || 800 * scale, 
        height: canvasDimensions.height || 1130 * scale, 
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
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 text-white p-4">
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
            pageIndex={pageNumber - 1} // zero-indexed
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
