import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import PDFCanvas from './PDFCanvas';
import { LumvalePDFEngine } from '@lumvalepdf/core';
import MergeWorkspace from './MergeWorkspace';
import type { PDFMetadata } from '@lumvalepdf/core';
import { rasterizePageWithRedactions } from '../utils/rasterize';
import MetadataModal from './MetadataModal';
import EncryptionModal from './EncryptionModal';
import SplitModal from './SplitModal';
import WatermarkModal from './WatermarkModal';
import OrganizerGrid from './OrganizerGrid';
import TopBar from './TopBar';
import Toolbar from './Toolbar';
import Bookmarks from './Bookmarks';
import { LayoutGrid, Bookmark } from 'lucide-react';
import SaveModal from './SaveModal';
import AnnotationToolbar from './AnnotationToolbar';
import type { Annotation, AnnotationType } from './AnnotationOverlay';


interface WorkspaceProps {
  documentBytes: Uint8Array;
  pageCount: number;
  onCloseDocument?: () => void;
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
export default function Workspace({ documentBytes: initialBytes, pageCount: initialCount, onCloseDocument }: WorkspaceProps) {
  const [documentBytes, setDocumentBytes] = useState<Uint8Array>(initialBytes);
  const [pageCount, setPageCount] = useState<number>(initialCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'thumbnails' | 'bookmarks'>('thumbnails');
  const [viewMode, setViewMode] = useState<'document' | 'organizer'>('document');
  const [zoom, setZoom] = useState(1.5);
  const [isEditMode, setIsEditMode] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<AnnotationType | null>(null);
  const [activeAnnotationColor, setActiveAnnotationColor] = useState('#FF3B30');
  const [activeAnnotationStrokeWidth, setActiveAnnotationStrokeWidth] = useState(4);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        setZoom(z => Math.min(Math.max(z + zoomChange, 0.5), 4.0));
      }
    };

    // Needs to be passive: false to prevent the entire browser tab from zooming
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Initialize sequential page order
  useEffect(() => {
    setPageOrder(Array.from({ length: pageCount }, (_, i) => i + 1));
  }, [pageCount]);

  useEffect(() => {
    if (pageOrder.length > 0) {
      setCurrentPage(1);
    }
  }, [documentBytes]);

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

        if (visiblePage !== -1 && visiblePage !== currentPage) {
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
  }, [pageOrder, currentPage]);

  const downloadPdf = (bytes: Uint8Array) => {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumvalepdf-export.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      
      // Export pages in the exact order specified by pageOrder
      // Convert to 0-based index for the engine
      const indices = pageOrder.map(p => p - 1);
      
      const extractedDoc = await engine.extractPages(indices);
      const newBytes = await extractedDoc.save();
      
      downloadPdf(newBytes as any);
    } catch (err) {
      console.error(err);
      alert('Failed to export document.');
    }
  };

  const handleSaveAndDownload = () => {
    if (annotations.length > 0) {
      setSaveModalOpen(true);
    } else {
      handleExport();
    }
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
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      engine.rotatePage(actualPageIndex, 90);
      const newBytes = await engine.exportBytes();
      
      setDocumentBytes(newBytes);
    } catch (err) {
      console.error(err);
      alert('Failed to rotate page.');
    }
  };

  const [mergeMode, setMergeMode] = useState(false);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [sourcePageCount, setSourcePageCount] = useState<number>(0);
  
  const [extractMode, setExtractMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isCompressing, setIsCompressing] = useState(false);

  const [showMetadata, setShowMetadata] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<PDFMetadata | null>(null);
  const [showEncryption, setShowEncryption] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);

  const handleOpenMetadata = async () => {
    try {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      setCurrentMetadata(engine.getMetadata());
      setShowMetadata(true);
    } catch (err) {
      console.error(err);
      alert('Failed to read metadata.');
    }
  };

  const handleSaveMetadata = async (metadata: Partial<PDFMetadata>) => {
    try {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      engine.updateMetadata(metadata);
      const newBytes = await engine.exportBytes();
      setDocumentBytes(newBytes);
      setShowMetadata(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save metadata.');
    }
  };

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);

  const handleApplyWatermark = async (options: any) => {
    try {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      engine.addWatermark(options);
      const newBytes = await engine.exportBytes();
      
      setDocumentBytes(newBytes);
      setShowWatermarkModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to apply watermark.');
    }
  };

  const handleEncryptDocument = async (userPassword?: string, ownerPassword?: string) => {
    try {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      const encryptedBytes = await engine.exportEncryptedBytes(userPassword, ownerPassword);
      
      const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lumvalepdf-locked.pdf';
      a.click();
      URL.revokeObjectURL(url);
      
      setShowEncryption(false);
    } catch (err) {
      console.error(err);
      alert('Failed to encrypt document.');
    }
  };


  const handleCheckUpdates = async () => {
    try {
      // Use any to bypass TS error since electronAPI isn't typed globally
      const hasUpdate = await (window as any).electronAPI?.checkForUpdates();
      if (!hasUpdate) {
        alert('LumvalePDF is up to date! (Or update check failed)');
      } else {
        alert('Update downloaded! It will be installed automatically on restart.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to check for updates.');
    }
  };
  
  const handleCompress = async () => {
    setIsCompressing(true);
    try {
      const originalSize = documentBytes.byteLength;
      
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      await engine.compressDocument();
      
      const compressedBytes = await engine.exportBytes();
      const compressedSize = compressedBytes.byteLength;
      
      setDocumentBytes(compressedBytes);
      
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
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      
      // Convert to 0-based index and sort
      const indices = Array.from(selectedPages).map(p => p - 1).sort((a, b) => a - b);
      
      const extractedDoc = await engine.extractPages(indices);
      const newBytes = await extractedDoc.save();
      
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
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const newBytes = new Uint8Array(buffer);
      
      const engine = new LumvalePDFEngine();
      const tempDoc = await engine.loadDocument(newBytes);
      
      setSourceBytes(newBytes);
      setSourcePageCount(tempDoc.getPageCount());
      setMergeMode(true); // Launch merge UI
      
    } catch (err) {
      console.error(err);
      alert('Failed to load second PDF.');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyMerge = async (sequence: { docId: 'primary' | 'secondary'; pageIndex: number }[]) => {
    try {
      if (!sourceBytes) return;
      const engine = new LumvalePDFEngine();
      await engine.buildFromSequence(
        sequence.map(s => ({
          docBytes: s.docId === 'primary' ? documentBytes : sourceBytes,
          pageIndex: s.pageIndex
        }))
      );
      
      const mergedBytes = await engine.exportBytes();
      
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
    <div className="flex flex-col h-screen w-full bg-vault-bg overflow-hidden text-vault-text relative z-0">
      {/* Static Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#F1C45E] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-[0.15] dark:opacity-[0.07] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#4FB89A] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-[0.15] dark:opacity-[0.07] pointer-events-none z-0"></div>

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

      {showSplitModal && (
        <SplitModal
          documentBytes={documentBytes}
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col h-full w-full relative z-10"
      >
        <TopBar 
          onExport={handleExport}
          onMerge={handleMergeClick}
          onExtract={() => setExtractMode(true)}
          onSplit={() => setShowSplitModal(true)}
          onCompress={handleCompress}
          onWatermark={() => setShowWatermarkModal(true)}
          isCompressing={isCompressing}
          onMetadata={handleOpenMetadata}
          onEncrypt={() => setShowEncryption(true)}
          onCheckUpdates={handleCheckUpdates}
          isEditMode={isEditMode}
          onSave={handleSaveAndDownload}
          onCloseDocument={onCloseDocument}
        />
        
        <Toolbar 
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onExport={handleExport}
          onMerge={handleMergeClick}
          onExtract={() => setExtractMode(!extractMode)}
          extractMode={extractMode}
          onSplit={() => setShowSplitModal(true)}
          onCompress={handleCompress}
          onWatermark={() => setShowWatermarkModal(true)}
          isCompressing={isCompressing}
          onMetadata={handleOpenMetadata}
          onEncrypt={() => setShowEncryption(true)}
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(z + 0.25, 4.0))}
          onZoomOut={() => setZoom(z => Math.max(z - 0.25, 0.5))}
          isEditMode={isEditMode}
          onToggleEditMode={() => {
            setIsEditMode(!isEditMode);
            if (isEditMode) setAnnotateMode(false);
          }}
          annotateMode={annotateMode}
          onToggleAnnotate={() => {
            setAnnotateMode(!annotateMode);
            setIsEditMode(false);
          }}
          isOrganizeMode={viewMode === 'organizer'}
          onOrganize={() => setViewMode(prev => prev === 'organizer' ? 'document' : 'organizer')}
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

        <SaveModal 
          isOpen={isSaveModalOpen} 
          onClose={() => setSaveModalOpen(false)} 
          onConfirm={async (asNative) => {
            setSaveModalOpen(false);
            if (annotations.length === 0) return;

            try {
              const engine = new LumvalePDFEngine();
              await engine.loadDocument(documentBytes);
              
              // Group annotations by page
              const annByPage = new Map<number, Annotation[]>();
              for (const ann of annotations) {
                if (!annByPage.has(ann.pageIndex)) annByPage.set(ann.pageIndex, []);
                annByPage.get(ann.pageIndex)!.push(ann);
              }
              
              // Apply to engine
              for (const [pageIndex, pageAnns] of annByPage.entries()) {
                const redactions = pageAnns.filter(a => a.type === 'redact');
                const others = pageAnns.filter(a => a.type !== 'redact');
                
                // If there are redactions, we MUST rasterize the page first to securely destroy text
                if (redactions.length > 0) {
                  // ann.pageIndex is 0-based. rasterizePageWithRedactions needs 1-based.
                  const imageBytes = await rasterizePageWithRedactions(documentBytes, pageIndex + 1, redactions);
                  // VaultPDFEngine uses 0-based index
                  await engine.replacePageWithImage(pageIndex, imageBytes, false);
                }

                // Apply remaining annotations (ink, text, highlight)
                if (others.length > 0) {
                  if (asNative) {
                    engine.addNativeAnnotations(pageIndex - 1, others);
                  } else {
                    engine.addFlattenedAnnotations(pageIndex - 1, others);
                  }
                }
              }
              
              const newBytes = await engine.exportBytes();
              setDocumentBytes(newBytes);
              setAnnotations([]); // Clear pending
              downloadPdf(newBytes);
            } catch (err) {
              console.error(err);
              alert('Failed to save annotations.');
            }
          }} 
        />

        {isEditMode && (
          <div className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-4 py-1.5 flex justify-center items-center border-b border-yellow-500/30 uppercase tracking-widest shadow-inner">
            Edit Mode Active
          </div>
        )}

        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />

        <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
          {viewMode === 'organizer' ? (
            <OrganizerGrid
              documentBytes={documentBytes}
              pageOrder={pageOrder}
              onReorder={handleReorderPages}
              onDelete={handleDeletePage}
              onRotate={handleRotatePage}
            />
          ) : (
            <>
              {/* Left Sidebar - Thumbnails */}
              {showSidebar && (
                <div className="w-64 bg-vault-surface/70 backdrop-blur-md border-r border-vault-border flex flex-col relative z-10">
                  <div className="p-4 border-b border-vault-border flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Pages ({pageCount})</span>
                      {extractMode && (
                        <span className="text-sm font-normal text-green-500 bg-green-500/20 px-2 py-0.5 rounded">
                          {selectedPages.size} Selected
                        </span>
                      )}
                    </div>
                    
                    <div className="flex bg-black/20 p-1 rounded-lg">
                      <button 
                        onClick={() => setActiveSidebarTab('thumbnails')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${activeSidebarTab === 'thumbnails' ? 'bg-vault-primary text-white shadow' : 'text-vault-muted hover:text-white'}`}
                      >
                        <LayoutGrid size={14} /> Thumbnails
                      </button>
                      <button 
                        onClick={() => setActiveSidebarTab('bookmarks')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${activeSidebarTab === 'bookmarks' ? 'bg-vault-primary text-white shadow' : 'text-vault-muted hover:text-white'}`}
                      >
                        <Bookmark size={14} /> Bookmarks
                      </button>
                    </div>
                  </div>
                  
                  {extractMode && activeSidebarTab === 'thumbnails' && (
                    <div className="absolute top-28 left-0 right-0 bg-vault-surface shadow-md p-2 flex flex-col gap-2 z-20 border-b border-vault-border">
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

                  <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pt-4 custom-scrollbar" data-testid="sidebar-scroll-container">
                    {activeSidebarTab === 'thumbnails' ? (
                      <Sidebar 
                        documentBytes={documentBytes}
                        pageOrder={pageOrder} 
                        currentPage={currentPage}
                        scrollContainerRef={sidebarScrollRef}
                        onSelectPage={(page) => {
                          isProgrammaticScroll.current = true;
                          setCurrentPage(page);
                          const el = document.getElementById(`pdf-page-${page}`);
                          const container = document.getElementById('main-scroll-container');
                          if (el && container) {
                            container.scrollTo({ top: el.offsetTop - 32, behavior: 'smooth' });
                            setTimeout(() => { isProgrammaticScroll.current = false; }, 800);
                          } else {
                            isProgrammaticScroll.current = false;
                          }
                        }} 
                        extractMode={extractMode}
                        selectedPages={selectedPages}
                        onToggleSelect={handleToggleSelect}
                        onReorder={handleReorderPages}
                        onDelete={handleDeletePage}
                        onRotate={handleRotatePage}
                        isEditMode={isEditMode}
                      />
                    ) : (
                      <div className="-mx-2 -mt-2">
                        <Bookmarks 
                          documentBytes={documentBytes}
                          currentPage={currentPage}
                          onSelectPage={(page) => {
                            isProgrammaticScroll.current = true;
                            setCurrentPage(page);
                            const el = document.getElementById(`pdf-page-${page}`);
                            const container = document.getElementById('main-scroll-container');
                            if (el && container) {
                              container.scrollTo({ top: el.offsetTop - 32, behavior: 'smooth' });
                              setTimeout(() => { isProgrammaticScroll.current = false; }, 800);
                            } else {
                              isProgrammaticScroll.current = false;
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Content - Canvas */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 min-h-0 overflow-auto bg-transparent relative z-10" 
                id="main-scroll-container"
              >
                <div className="min-h-full w-full flex flex-col items-center p-8 space-y-8">
                  {pageOrder.map((pageNum, idx) => (
                    <div key={`main-page-${pageNum}`} id={`pdf-page-${idx + 1}`} className="flex justify-center pdf-page-wrapper">
                      <PDFCanvas 
                        documentBytes={documentBytes} 
                        pageNumber={pageNum} 
                        scale={zoom}
                        activeAnnotationTool={annotateMode ? activeAnnotationTool : null}
                        activeAnnotationColor={activeAnnotationColor}
                        activeAnnotationStrokeWidth={activeAnnotationStrokeWidth}
                        annotations={annotations}
                        onAnnotationsChange={setAnnotations}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
