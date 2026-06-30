import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import Sidebar from './Sidebar';
import PDFCanvas from './PDFCanvas';
import ViewAids from './ViewAids';
import { pagePairs } from '../utils/viewAids';
import { LumvalePDFEngine } from '@lumvale/pdf-core';
import MergeWorkspace from './MergeWorkspace';
import type { PDFMetadata } from '@lumvale/pdf-core';
import { rasterizePageWithRedactions } from '../utils/rasterize';
import MetadataModal from './MetadataModal';
import EncryptionModal from './EncryptionModal';
import SplitModal from './SplitModal';
import WatermarkModal from './WatermarkModal';
import BatesModal from './BatesModal';
import HeaderFooterModal from './HeaderFooterModal';
import OrganizerGrid from './OrganizerGrid';
import TopBar from './TopBar';
import Toolbar from './Toolbar';
import Bookmarks from './Bookmarks';
import { LayoutGrid, Bookmark } from 'lucide-react';
import SaveModal from './SaveModal';
import ExportImageModal from './ExportImageModal';
import type { ExportImageRequest } from './ExportImageModal';
import AboutModal from './AboutModal';
import { exportPagesToImages } from '../utils/exportImages';
import AnnotationToolbar from './AnnotationToolbar';
import type { Annotation, AnnotationType } from './AnnotationOverlay';
import { useDocumentEngine } from '../engine';
import { useIsSmallScreen } from '../hooks/useIsSmallScreen';

const MAIN_VIEWER_WINDOW = 6;

/** Internal render scale that the UI presents as "100%". pdf.js renders at this
 *  scale for crisp output; the zoom % shown to the user is relative to it. */
const BASE_ZOOM = 1.5;
/** Each zoom button press moves the displayed percentage by 25%. */
const ZOOM_STEP = BASE_ZOOM * 0.25;
const MIN_ZOOM = BASE_ZOOM * 0.25; // 25%
const MAX_ZOOM = BASE_ZOOM * 3;    // 300%

export interface WorkspaceProps {
  documentBytes: Uint8Array | null;
  documentName?: string;
  pageCount: number;
  onFilesSelected?: (files: FileList | File[]) => void;
  onCloseDocument?: () => void;
  hideLoginButton?: boolean;
  customToolbarLeft?: React.ReactNode;
  customToolbarCenter?: React.ReactNode;
  customToolbarRight?: React.ReactNode;
  customFileMenuItems?: React.ReactNode;
  customToolsMenuItems?: React.ReactNode;
  /** Extra top-level menus added to the menu bar after File (see TopBar). */
  customMenus?: { id: string; label: string; items: React.ReactNode }[];
  customTopBarRight?: React.ReactNode;
  customTabBar?: React.ReactNode;
  onSave?: () => void;
  rightSidebar?: React.ReactNode;
}

/**
 * Workspace is the primary layout and state container for the VaultPDF application.
 * It manages the loaded PDF document, handles user interactions like zooming and editing modes,
 * and orchestrates rendering the sidebar and the main scrolling canvas area.
 * 
 * Features:
 * - PDF Document Loading & Merging
 * - Toolbar and TopBar orchestration
 * - Annotation state management and Save/Export logic
 * - Virtualized or optimized scrolling container for PDFCanvas instances
 */
export default function Workspace({ 
  documentBytes: initialBytes, 
  documentName = 'document.pdf',
  pageCount: initialCount, 
  onCloseDocument,
  customToolbarLeft,
  customToolbarCenter,
  customToolbarRight,
  customFileMenuItems,
  customToolsMenuItems,
  customMenus,
  customTopBarRight,
  customTabBar,
  onFilesSelected,
  onSave,
  rightSidebar
}: WorkspaceProps) {
  // Injected document engine (defaults to the local @lumvale/pdf-core adapter
  // when no WorkspaceProvider is present). A host can inject a different one.
  const docEngine = useDocumentEngine();
  const [documentBytes, setDocumentBytes] = useState<Uint8Array | null>(initialBytes);
  const [pageCount, setPageCount] = useState<number>(initialCount);
  
  useEffect(() => {
    setDocumentBytes(initialBytes);
    setPageCount(initialCount);
  }, [initialBytes, initialCount]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const isSmallScreen = useIsSmallScreen();
  const [activeSidebarTab, setActiveSidebarTab] = useState<'thumbnails' | 'bookmarks'>('thumbnails');

  // On small screens the thumbnail panel is a slide-over drawer — keep it closed
  // by default (open on desktop). Re-applies when crossing the breakpoint.
  useEffect(() => {
    setShowSidebar(!isSmallScreen);
  }, [isSmallScreen]);
  const [viewMode, setViewMode] = useState<'document' | 'organizer'>('document');
  const [zoom, setZoom] = useState(1.5);
  // Viewer aids: dual-page (book) layout + ruler / grid guides.
  const [dualPage, setDualPage] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  /** Intrinsic page size in PDF points, learned from the first rendered page.
   *  Used to size placeholders for pages outside the virtualization window so
   *  the scroll height stays stable. Defaults to US Letter. */
  const [pageBaseSize, setPageBaseSize] = useState({ w: 612, h: 792 });
  const handleRenderedSize = useCallback((w: number, h: number) => {
    setPageBaseSize(prev => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1) ? prev : { w, h });
  }, []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<AnnotationType | null>(null);
  const [activeAnnotationColor, setActiveAnnotationColor] = useState('#FF3B30');
  const [activeAnnotationStrokeWidth, setActiveAnnotationStrokeWidth] = useState(4);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const [saveAction, setSaveAction] = useState<'save' | 'saveAs' | null>(null);
  
  const [mergeMode, setMergeMode] = useState(false);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [sourcePageCount, setSourcePageCount] = useState<number>(0);
  
  const [extractMode, setExtractMode] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<any>(null);
  const [showEncryption, setShowEncryption] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /** Ref to the overflow-y-auto sidebar container — passed to Sidebar so it
   *  can check real bounds before calling scrollIntoView (Bug 1 fix). */
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  // Handle Pinch-to-Zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        // Adjust zoom sensitivity based on deltaY
        const zoomChange = e.deltaY * -0.005;
        setZoom(z => Math.min(Math.max(z + zoomChange, MIN_ZOOM), MAX_ZOOM));
      }
    };

    // Needs to be passive: false to prevent the entire browser tab from zooming
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard zoom: Ctrl/Cmd +/- to zoom, Ctrl/Cmd+0 to reset to 100%.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      // Don't hijack typing in form fields or editable regions (e.g. modal
      // inputs, annotation text boxes).
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(BASE_ZOOM);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Initialize sequential page order
  useEffect(() => {
    setPageOrder(Array.from({ length: pageCount }, (_, i) => i + 1));
  }, [pageCount]);

  // Keep a ref so the IntersectionObserver callback always has the latest currentPage
  // without needing to be in its dependency array (which would rebuild the observer on every scroll)
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        let maxRatio = 0;
        let visiblePage = -1;
        
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const idParts = entry.target.id.split('-');
            visiblePage = parseInt(idParts[idParts.length - 1], 10);
          }
        });

        if (visiblePage !== -1 && visiblePage !== currentPageRef.current) {
          setCurrentPage(visiblePage);
        }
      },
      { 
        root: container, 
        rootMargin: '-10% 0px -10% 0px',
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9] 
      }
    );

    const observePages = () => {
      pageOrder.forEach((_, idx) => {
        const el = document.getElementById(`pdf-page-${idx + 1}`);
        if (el) observer.observe(el);
      });
    };
    
    const to = setTimeout(observePages, 100);

    return () => {
      clearTimeout(to);
      observer.disconnect();
    };
  }, [pageOrder]);

  const downloadPdf = (bytes: Uint8Array) => {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumvalepdf-export.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateFinalPdfBytes = async (asNative: boolean = true): Promise<Uint8Array> => {
    const engine = new LumvalePDFEngine();
    await engine.loadDocument(documentBytes!);

    // 1. Apply Annotations
    if (annotations.length > 0) {
      const annByPage = new Map<number, Annotation[]>();
      for (const ann of annotations) {
        if (!annByPage.has(ann.pageIndex)) annByPage.set(ann.pageIndex, []);
        annByPage.get(ann.pageIndex)!.push(ann);
      }
      
      for (const [pageIndex, pageAnns] of annByPage.entries()) {
        const redactions = pageAnns.filter(a => a.type === 'redact');
        const others = pageAnns.filter(a => a.type !== 'redact');
        
        if (redactions.length > 0) {
          const imageBytes = await rasterizePageWithRedactions(documentBytes!, pageIndex + 1, redactions);
          await engine.replacePageWithImage(pageIndex, imageBytes, false);
        }

        if (others.length > 0) {
          if (asNative) {
            engine.addNativeAnnotations(pageIndex, others);
          } else {
            engine.addFlattenedAnnotations(pageIndex, others);
          }
        }
      }
    }

    // 2. Extract/Reorder Pages
    const indices = pageOrder.map(p => p - 1);
    const extractedDoc = await engine.extractPages(indices);
    return await extractedDoc.save();
  };

  const executeSave = async (asNative: boolean = true) => {
    try {
      console.log("executeSave started");
      const newBytes = await generateFinalPdfBytes(asNative);
      console.log("generateFinalPdfBytes completed, updating documentBytes");
      setDocumentBytes(newBytes);
      setAnnotations([]);
      const newPageCount = pageOrder.length;
      setPageOrder(Array.from({ length: newPageCount }, (_, i) => i + 1));
      
      if (onSave) {
        onSave();
      }
      console.log("executeSave completed");
    } catch (err) {
      console.error(err);
      alert('Failed to save document.');
    }
  };

  const executeSaveAs = async (asNative: boolean = true, fileName: string = 'lumvalepdf-export.pdf') => {
    try {
      console.log("executeSaveAs started");
      const newBytes = await generateFinalPdfBytes(asNative);
      console.log("generateFinalPdfBytes completed, initiating download...");
      
      const blob = new Blob([newBytes as any], { type: 'application/pdf' });

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log("executeSaveAs completed using showSaveFilePicker");
          return;
        } catch (err: any) {
          // AbortError means user cancelled the dialog
          if (err.name === 'AbortError') return;
          console.error('showSaveFilePicker failed, falling back', err);
        }
      }
      
      // Fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      console.log("executeSaveAs completed using fallback");
    } catch (err) {
      console.error(err);
      alert('Failed to save document as copy.');
    }
  };

  const handleSave = () => {
    if (annotations.length > 0) {
      setSaveAction('save');
      setSaveModalOpen(true);
    } else {
      executeSave(true);
    }
  };

  const handleSaveAs = () => {
    setSaveAction('saveAs');
    setSaveModalOpen(true);
  };

  const handleExport = () => setShowExportModal(true);

  /** Derive a safe file-name stem from the document name for exported images.
   *  Drops any directory components and extension, then neutralises characters
   *  that could produce odd paths inside the export zip. */
  const deriveBaseName = (name: string) => {
    const stem = (name || 'document')
      .replace(/^.*[/\\]/, '')          // drop any directory path
      .replace(/\.[^.]+$/, '')           // drop the trailing extension
      .replace(/[^\w.\- ]+/g, '_')       // neutralise unusual characters
      .replace(/^[.\s]+|[.\s]+$/g, '');  // trim leading/trailing dots & spaces
    return stem || 'document';
  };

  const handleExportImages = async (
    req: ExportImageRequest,
    onProgress?: (done: number, total: number) => void,
  ) => {
    // Map visual page positions to the underlying PDF page numbers so the
    // export honours any reordering/deletions the user has made.
    const pageNumbers = req.visualPages
      .map(v => pageOrder[v - 1])
      .filter((p): p is number => typeof p === 'number');
    if (pageNumbers.length === 0) throw new Error('No valid pages to export.');

    await exportPagesToImages(
      documentBytes!,
      { format: req.format, scale: req.scale, pageNumbers, baseName: deriveBaseName(documentName) },
      onProgress,
    );
    setShowExportModal(false);
  };

  const handleReorderPages = (startIndex: number, endIndex: number) => {
    setPageOrder(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const handleDeletePage = (index: number) => {
    setPageOrder(prev => {
      const result = Array.from(prev);
      result.splice(index, 1);
      return result;
    });
    setPageCount(prev => prev - 1);
    
    // Adjust current page if it's out of bounds after deletion
    if (currentPage > pageOrder.length - 1) {
      setCurrentPage(Math.max(1, pageOrder.length - 1));
    }
  };

  const handleRotatePage = async (index: number) => {
    try {
      const actualPageIndex = pageOrder[index] - 1;
      const rotated = await docEngine.rotatePage(documentBytes!, actualPageIndex, 90);
      // Copy into a fresh array to guarantee a new identity: the rotate engine can
      // return bytes that alias the input buffer, which makes React's setState bail
      // and the pdf cache (keyed by reference) serve the pre-rotate parse — so the
      // page would stay visually unrotated even though the bytes changed.
      const newBytes = new Uint8Array(rotated);
      requestAnimationFrame(() => {
        startTransition(() => setDocumentBytes(newBytes));
      });
    } catch (err) {
      console.error(err);
      alert('Failed to rotate page.');
    }
  };

  const [showBatesModal, setShowBatesModal] = useState(false);
  const [showHeaderFooterModal, setShowHeaderFooterModal] = useState(false);

  const handleCompress = async () => {
    setIsCompressing(true);
    try {
      const originalSize = documentBytes!.byteLength;
      
      const compressedBytes = await docEngine.compress(documentBytes!);
      const compressedSize = compressedBytes.byteLength;

      startTransition(() => setDocumentBytes(compressedBytes));

      const savedKb = ((originalSize - compressedSize) / 1024).toFixed(2);
      const originalKb = (originalSize / 1024).toFixed(2);
      const newKb = (compressedSize / 1024).toFixed(2);
      
      alert(`Compression Complete!\nOriginal: ${originalKb} KB\nCompressed: ${newKb} KB\nSaved: ${savedKb} KB`);
    } catch (err) {
      console.error(err);
      alert('Failed to compress document.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleOpenMetadata = async () => {
    const meta = await docEngine.getMetadata(documentBytes!);
    setCurrentMetadata(meta);
    setShowMetadata(true);
  };

  const handleSaveMetadata = async (newMetadata: PDFMetadata) => {
    const newBytes = await docEngine.setMetadata(documentBytes!, newMetadata);
    setDocumentBytes(newBytes);
    setShowMetadata(false);
  };

  const handleEncryptDocument = async (userPass?: string, ownerPass?: string) => {
    try {
      const encryptedBytes = await docEngine.encrypt(documentBytes!, {
        userPassword: userPass,
        ownerPassword: ownerPass,
      });
      // Deliver the protected file as a download rather than swapping it into the
      // viewer: the viewer (and Save) can't read password-protected bytes without
      // the password, so replacing the working copy would lock the user out of
      // their own open document. The on-screen document stays as-is.
      const blob = new Blob([encryptedBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deriveBaseName(documentName)}-protected.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowEncryption(false);
    } catch (err) {
      console.error(err);
      alert('Failed to encrypt document.');
    }
  };

  const handleApplyWatermark = async (options: any) => {
    try {
      const watermarkedBytes = await docEngine.addWatermark(documentBytes!, options);
      // Close the modal first (high-priority update), then yield to the browser
      // so the removal paints before the heavy document re-render runs as a
      // low-priority transition. Keeps the UI responsive on large files.
      setShowWatermarkModal(false);
      requestAnimationFrame(() => {
        startTransition(() => setDocumentBytes(watermarkedBytes));
      });
    } catch (err) {
      console.error(err);
      alert('Failed to apply watermark.');
    }
  };

  const handleApplyBates = async (options: any) => {
    try {
      const batesBytes = await docEngine.addBatesNumbering(documentBytes!, options);
      setShowBatesModal(false);
      requestAnimationFrame(() => {
        startTransition(() => setDocumentBytes(batesBytes));
      });
    } catch (err) {
      console.error('Failed to apply page numbering:', err);
      alert('Failed to apply page numbering.');
    }
  };

  const handleApplyHeadersFooters = async (options: any) => {
    try {
      const hfBytes = await docEngine.addHeadersFooters(documentBytes!, options);
      setShowHeaderFooterModal(false);
      requestAnimationFrame(() => {
        startTransition(() => setDocumentBytes(hfBytes));
      });
    } catch (err) {
      console.error(err);
      alert('Failed to apply headers and footers.');
    }
  };

  const handleCheckUpdates = () => {
    alert('You are up to date!');
  };

  const handleToggleSelect = (page: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(page)) {
        newSet.delete(page);
      } else {
        newSet.add(page);
      }
      return newSet;
    });
  };

  const handleExtractConfirm = async () => {
    if (selectedPages.size === 0) {
      alert("Please select at least one page.");
      return;
    }

    try {
      const indices = Array.from(selectedPages).map(p => p - 1).sort((a, b) => a - b);
      const newBytes = await docEngine.extractPages(documentBytes!, indices);

      const blob = new Blob([newBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lumvalepdf-extracted.pdf';
      a.click();
      URL.revokeObjectURL(url);
      
      setExtractMode(false);
      setSelectedPages(new Set());
    } catch (err) {
      console.error(err);
      alert('Failed to extract pages.');
    }
  };

  const handleMergeClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const buffer = await file.arrayBuffer();
      const newBytes = new Uint8Array(buffer);
      try {
        const count = await docEngine.getPageCount(newBytes);
        setSourceBytes(newBytes);
        setSourcePageCount(count);
        setMergeMode(true); // Launch merge UI
      } catch (err) {
        console.error(err);
        alert('Failed to load second PDF.');
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFilesSelected) {
      onFilesSelected(e.target.files);
    }
    if (openFileInputRef.current) {
      openFileInputRef.current.value = '';
    }
  };

  const handleApplyMerge = async (sequence: { docId: 'primary' | 'secondary'; pageIndex: number }[]) => {
    try {
      if (!sourceBytes) return;
      const mergedBytes = await docEngine.buildFromSequence(
        sequence.map(s => ({
          documentBytes: (s.docId === 'primary' ? documentBytes : sourceBytes)!,
          pageIndex: s.pageIndex
        }))
      );

      setDocumentBytes(mergedBytes);
      setPageCount(sequence.length);
      setMergeMode(false);
      setSourceBytes(null);
    } catch (err) {
      console.error(err);
      alert('Failed to build PDF sequence.');
    }
  };

  if (mergeMode && sourceBytes) {
    return (
      <MergeWorkspace 
        primaryPageCount={pageCount}
        secondaryPageCount={sourcePageCount}
        onApplyMerge={handleApplyMerge}
        onCancel={() => { setMergeMode(false); setSourceBytes(null); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-lumvale-bg)] overflow-hidden text-[var(--color-lumvale-text)] relative z-0">
      {/* Slow, theme-aware aurora backdrop (see fx.css). Sits behind all chrome;
          shows through the canvas/empty-state areas which are left transparent. */}
      <div className="workspace-aurora" aria-hidden="true" />
      {showMetadata && currentMetadata && (
        <MetadataModal 
          initialMetadata={currentMetadata}
          onSave={handleSaveMetadata}
          onClose={() => setShowMetadata(false)}
        />
      )}

      {showEncryption && (
        <EncryptionModal 
          onEncrypt={handleEncryptDocument}
          onClose={() => setShowEncryption(false)}
        />
      )}

      {/* Hidden file input for open documents */}
      <input 
        type="file" 
        multiple
        accept=".pdf,.docx,.xlsx,.pptx,.md,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/markdown" 
        ref={openFileInputRef} 
        onChange={handleOpenFiles} 
        className="hidden" 
      />

      <TopBar
        compact={isSmallScreen}
        onOpen={() => openFileInputRef.current?.click()}
        onExport={handleExport}
        onMerge={handleMergeClick}
        onExtract={() => setExtractMode(!extractMode)}
        onSplit={() => setShowSplitModal(true)}
        onCompress={handleCompress}
        onWatermark={() => setShowWatermarkModal(true)}
        onBates={() => setShowBatesModal(true)}
        onHeadersFooters={() => setShowHeaderFooterModal(true)}
        onMetadata={handleOpenMetadata}
        onEncrypt={() => setShowEncryption(true)}
        onCheckUpdates={handleCheckUpdates}
        onAbout={() => setShowAbout(true)}
        isCompressing={isCompressing}
        isEditMode={isEditMode}
        onCloseDocument={onCloseDocument}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        customFileMenuItems={customFileMenuItems}
        customToolsMenuItems={customToolsMenuItems}
        customMenus={customMenus}
        customTopBarRight={customTopBarRight}
      />
      
      {customTabBar}

      <Toolbar
        compact={isSmallScreen}
        onOpen={() => openFileInputRef.current?.click()}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onExport={handleExport}
        onMerge={handleMergeClick}
        onExtract={() => setExtractMode(!extractMode)}
        extractMode={extractMode}
        onSplit={() => setShowSplitModal(true)}
        onCompress={handleCompress}
        onWatermark={() => setShowWatermarkModal(true)}
        onBates={() => setShowBatesModal(true)}
        onHeadersFooters={() => setShowHeaderFooterModal(true)}
        isCompressing={isCompressing}
        onMetadata={handleOpenMetadata}
        onEncrypt={() => setShowEncryption(true)}
        zoom={zoom}
        baseZoom={BASE_ZOOM}
        onZoomIn={() => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM))}
        onZoomOut={() => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM))}
        onFitWidth={() => {
          const c = scrollContainerRef.current;
          if (!c) return;
          // Leave room for vertical scrollbar + a little breathing space.
          const avail = c.clientWidth - 48;
          if (avail <= 0) return;
          setZoom(Math.min(Math.max(avail / pageBaseSize.w, MIN_ZOOM), MAX_ZOOM));
        }}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(v => !v)}
        annotateMode={annotateMode}
        // Annotation is additive and reversible (it isn't applied until save), so
        // it's available without Edit Mode and the two modes coexist freely —
        // matching how comment tools work in Acrobat/Preview.
        onToggleAnnotate={() => setAnnotateMode(v => !v)}
        onZoomReset={() => setZoom(BASE_ZOOM)}
        isOrganizeMode={viewMode === 'organizer'}
        onOrganize={() => setViewMode(v => v === 'document' ? 'organizer' : 'document')}
        customToolbarLeft={customToolbarLeft}
        customToolbarCenter={customToolbarCenter}
        customToolbarRight={customToolbarRight}
        viewAids={{
          dualPage,
          showRuler,
          showGrid,
          onToggleDual: () => setDualPage(v => !v),
          onToggleRuler: () => setShowRuler(v => !v),
          onToggleGrid: () => setShowGrid(v => !v),
        }}
      />

      {annotateMode && (
        <AnnotationToolbar 
          activeTool={activeAnnotationTool}
          onToolSelect={setActiveAnnotationTool}
          activeColor={activeAnnotationColor}
          onColorSelect={setActiveAnnotationColor}
          strokeWidth={activeAnnotationStrokeWidth}
          onStrokeWidthSelect={setActiveAnnotationStrokeWidth}
          hasPendingAnnotations={annotations.length > 0}
          onClearAnnotations={() => setAnnotations([])}
          onClose={() => setAnnotateMode(false)}
        />
      )}

      {isEditMode && (
        <div className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-4 py-1.5 flex justify-center items-center gap-2 border-b border-yellow-500/30 uppercase tracking-widest shadow-inner">
          Edit Mode Active
          {isSmallScreen && (
            <span className="normal-case font-medium tracking-normal opacity-80">· some tools open on a larger screen</span>
          )}
        </div>
      )}

      {showSplitModal && (
        <SplitModal
          documentBytes={documentBytes!}
          pageCount={pageCount}
          onClose={() => setShowSplitModal(false)}
        />
      )}

      {showWatermarkModal && (
        <WatermarkModal
          pageCount={pageCount}
          onApply={handleApplyWatermark}
          onClose={() => setShowWatermarkModal(false)}
        />
      )}

      {showBatesModal && (
        <BatesModal
          pageCount={pageCount}
          onApply={handleApplyBates}
          onClose={() => setShowBatesModal(false)}
        />
      )}

      {showHeaderFooterModal && (
        <HeaderFooterModal
          pageCount={pageCount}
          onApply={handleApplyHeadersFooters}
          onClose={() => setShowHeaderFooterModal(false)}
        />
      )}

      {showExportModal && documentBytes && (
        <ExportImageModal
          pageCount={pageOrder.length}
          currentPage={currentPage}
          onExport={handleExportImages}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">
        {!documentBytes ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div 
              aria-label="workspace-uploader"
              className="border-2 border-dashed border-[var(--color-lumvale-border)] rounded-2xl p-12 text-center cursor-pointer hover:border-lumvale-primary/50 hover:bg-[var(--color-lumvale-border)] transition-all w-full max-w-xl"
              onClick={() => openFileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full bg-lumvale-primary/20 text-lumvale-primary mx-auto flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-lumvale-text)] mb-2">Open a Document</h2>
              <p className="text-[var(--color-lumvale-muted)]">Click here to browse for PDF, Word, Excel, PowerPoint, Markdown, or Image files.</p>
            </div>
          </div>
        ) : viewMode === 'organizer' ? (
          <OrganizerGrid 
            documentBytes={documentBytes!}
            pageOrder={pageOrder}
            onReorder={handleReorderPages}
            onDelete={handleDeletePage}
            onRotate={(index) => {
                handleRotatePage(index);
            }}
          />
        ) : (
          <>
            {/* Mobile: dim backdrop behind the slide-over drawer. */}
            {isSmallScreen && showSidebar && (
              <div
                className="absolute inset-0 z-30 bg-black/40"
                onClick={() => setShowSidebar(false)}
                aria-hidden="true"
              />
            )}
            <div
              className={
                isSmallScreen
                  ? `absolute inset-y-0 left-0 z-40 w-72 max-w-[85%] bg-[var(--color-lumvale-surface)] border-r border-[var(--color-lumvale-border)] flex flex-col shadow-2xl ${showSidebar ? '' : 'hidden'}`
                  : `bg-[var(--color-lumvale-surface)] border-r border-[var(--color-lumvale-border)] transition-all duration-300 ease-in-out flex flex-col z-20 ${showSidebar ? 'w-64' : 'w-0'}`
              }
              style={isSmallScreen ? undefined : { width: showSidebar ? '256px' : '0px', overflow: 'hidden' }}
            >
              {showSidebar && (
                <div className="flex-1 flex flex-col w-64 min-w-[256px] overflow-hidden">
                  <div className="p-4 border-b border-[var(--color-lumvale-border)] flex justify-between items-center">
                    <span className="font-bold text-lg text-[var(--color-lumvale-text)]">Pages ({pageCount})</span>
                    {extractMode && (
                      <span className="text-sm font-normal text-green-500 bg-green-500/20 px-2 py-0.5 rounded">
                        {selectedPages.size} Selected
                      </span>
                    )}
                  </div>
                  {extractMode && activeSidebarTab === 'thumbnails' && (
                    <div className="p-2 flex flex-col gap-2 border-b border-[var(--color-lumvale-border)]">
                      <button
                        onClick={handleExtractConfirm}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 rounded text-sm transition-colors"
                      >
                        Download Selected
                      </button>
                      <button
                        onClick={() => { setExtractMode(false); setSelectedPages(new Set()); }}
                        className="w-full bg-transparent hover:bg-red-500/20 text-red-400 py-1.5 rounded text-sm transition-colors border border-red-500/30"
                      >
                        Cancel Extraction
                      </button>
                    </div>
                  )}
                  <div className="flex border-b border-[var(--color-lumvale-border)]">
                    <button
                      onClick={() => setActiveSidebarTab('thumbnails')}
                      className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeSidebarTab === 'thumbnails' 
                          ? 'border-lumvale-primary text-lumvale-primary' 
                          : 'border-transparent text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)]'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4 inline-block mr-2" />
                      Thumbnails
                    </button>
                    <button
                      onClick={() => setActiveSidebarTab('bookmarks')}
                      className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeSidebarTab === 'bookmarks' 
                          ? 'border-lumvale-primary text-lumvale-primary' 
                          : 'border-transparent text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)]'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 inline-block mr-2" />
                      Bookmarks
                    </button>
                  </div>
                  <div
                    ref={sidebarScrollRef}
                    data-testid="sidebar-scroll-container"
                    className="flex-1 overflow-y-auto custom-scrollbar p-4"
                  >
                    {activeSidebarTab === 'thumbnails' ? (
                      <Sidebar
                        documentBytes={documentBytes!}
                        pageOrder={pageOrder}
                        currentPage={currentPage}
                        onSelectPage={(page) => {
                          if (isSmallScreen) setShowSidebar(false);
                          const el = document.getElementById(`pdf-page-${page}`);
                          if (el) {
                            isProgrammaticScroll.current = true;
                            
                            if (scrollContainerRef.current) {
                              const containerRect = scrollContainerRef.current.getBoundingClientRect();
                              const elRect = el.getBoundingClientRect();
                              const scrollTop = scrollContainerRef.current.scrollTop + (elRect.top - containerRect.top) - 32;
                              scrollContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
                            } else {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                            
                            setCurrentPage(page);
                            setTimeout(() => {
                              isProgrammaticScroll.current = false;
                            }, 1000);
                          }
                        }}
                        scrollContainerRef={sidebarScrollRef}
                        isEditMode={isEditMode}
                        extractMode={extractMode}
                        selectedPages={selectedPages}
                        onToggleSelect={handleToggleSelect}
                        onReorder={handleReorderPages}
                        onDelete={handleDeletePage}
                        onRotate={handleRotatePage}
                      />
                    ) : (
                      <Bookmarks 
                        documentBytes={documentBytes!}
                        currentPage={currentPage}
                        onSelectPage={(page) => {
                          if (isSmallScreen) setShowSidebar(false);
                          const el = document.getElementById(`pdf-page-${page}`);
                          if (el) {
                            isProgrammaticScroll.current = true;
                            if (scrollContainerRef.current) {
                              const containerRect = scrollContainerRef.current.getBoundingClientRect();
                              const elRect = el.getBoundingClientRect();
                              const scrollTop = scrollContainerRef.current.scrollTop + (elRect.top - containerRect.top) - 32;
                              scrollContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
                            } else {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                            setCurrentPage(page);
                            setTimeout(() => {
                              isProgrammaticScroll.current = false;
                            }, 1000);
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
              {/* Viewer-aid toggles now live in the Toolbar (see Toolbar viewAids). */}
              <div
                ref={scrollContainerRef}
                id="main-scroll-container"
                className="flex-1 min-h-0 overflow-y-auto w-full flex justify-center custom-scrollbar"
              >
                <div
                  className="py-8 flex flex-col space-y-4"
                  style={{ width: pageBaseSize.w * zoom * (dualPage ? 2 : 1) + (dualPage ? 16 : 0) }}
                >
                  {(dualPage ? pagePairs(pageOrder) : pageOrder.map((p) => [p])).map((row, rowIdx) => (
                    <div key={`row-${rowIdx}`} className="flex justify-center gap-4">
                      {row.map((pageNum, j) => {
                        const idx = rowIdx * (dualPage ? 2 : 1) + j;
                        const shouldMount = Math.abs((idx + 1) - currentPage) <= MAIN_VIEWER_WINDOW;
                        return (
                          <div key={`main-page-${pageNum}`} id={`pdf-page-${idx + 1}`} className="flex justify-center pdf-page-wrapper">
                            {shouldMount ? (
                              <PDFCanvas
                                documentBytes={documentBytes}
                                pageNumber={pageNum}
                                scale={zoom}
                                activeAnnotationTool={annotateMode ? activeAnnotationTool : null}
                                activeAnnotationColor={activeAnnotationColor}
                                activeAnnotationStrokeWidth={activeAnnotationStrokeWidth}
                                annotations={annotations}
                                onAnnotationsChange={setAnnotations}
                                onRenderedSize={handleRenderedSize}
                                placeholderWidth={pageBaseSize.w * zoom}
                                placeholderHeight={pageBaseSize.h * zoom}
                              />
                            ) : (
                              <div
                                className="relative shadow-2xl bg-white"
                                style={{ width: pageBaseSize.w * zoom, height: pageBaseSize.h * zoom, maxWidth: '100%' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <ViewAids showRuler={showRuler} showGrid={showGrid} />
            </div>
            {rightSidebar && (
              <div className="flex-none border-l border-[var(--color-lumvale-border)] bg-[var(--color-lumvale-surface)] h-full overflow-hidden">
                {rightSidebar}
              </div>
            )}
          </>
        )}
      </div>

      <SaveModal 
        isOpen={isSaveModalOpen} 
        isSaveAs={saveAction === 'saveAs'}
        hasAnnotations={annotations.length > 0}
        originalFilename={documentName}
        onClose={() => {
          setSaveModalOpen(false);
          setSaveAction(null);
        }} 
        onConfirm={async (asNative, filename) => {
          setSaveModalOpen(false);
          if (saveAction === 'save') {
            await executeSave(asNative);
          } else if (saveAction === 'saveAs') {
            await executeSaveAs(asNative, filename);
          }
          setSaveAction(null);
        }} 
      />

      <input 
        type="file" 
        accept="application/pdf" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </div>
  );
}