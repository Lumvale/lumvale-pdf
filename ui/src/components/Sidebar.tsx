import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { X, RotateCw } from 'lucide-react';
import PDFCanvas from './PDFCanvas';

interface SidebarProps {
  documentBytes: Uint8Array;
  pageOrder: number[];
  currentPage: number;
  onSelectPage: (page: number) => void;
  /** The overflow-y-auto container that wraps this Sidebar — used for the
   *  accurate bounds check before firing scrollIntoView. Passed from Workspace. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  extractMode?: boolean;
  selectedPages?: Set<number>;
  onToggleSelect?: (page: number) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
  onDelete?: (pageIndex: number) => void;
  onRotate?: (pageIndex: number) => void;
  isEditMode: boolean;
}

export default function Sidebar({ 
  documentBytes,
  pageOrder, 
  currentPage, 
  onSelectPage,
  scrollContainerRef,
  extractMode = false,
  selectedPages = new Set(),
  onToggleSelect,
  onReorder,
  onDelete,
  onRotate,
  isEditMode
}: SidebarProps) {

  useEffect(() => {
    // Bug fix: always check against the *actual* scrollable container
    // (the overflow-y-auto div in Workspace), not the Droppable inner div
    // which has no scroll and whose rect equals the full content height.
    const el = document.getElementById(`thumbnail-${currentPage}`);
    const container = scrollContainerRef.current;
    if (!el) return;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const isOutOfView = elRect.top < containerRect.top || elRect.bottom > containerRect.bottom;
      if (isOutOfView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      // Fallback if ref isn't wired yet
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage, scrollContainerRef]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="sidebar-pages">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
            {pageOrder.map((pageNum, index) => {
              const isSelected = currentPage === index + 1;
              const isExtracted = selectedPages.has(index + 1);

              return (
                <Draggable key={`page-${pageNum}`} draggableId={`page-${pageNum}`} index={index} isDragDisabled={!isEditMode}>
                  {(provided, snapshot) => (
                    <div
                      id={`thumbnail-${index + 1}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.8 : 1,
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          scale: isSelected ? 1.03 : 1,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        whileHover={{ scale: isSelected ? 1.03 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        data-active={isSelected ? 'true' : 'false'}
                        data-testid={`thumbnail-page-${index + 1}`}
                        onClick={() => {
                          if (extractMode && onToggleSelect) {
                            onToggleSelect(index + 1);
                          } else {
                            onSelectPage(index + 1);
                          }
                        }}
                        className={`cursor-pointer rounded-lg border-2 p-2 transition-colors relative group ${
                          extractMode 
                            ? isExtracted 
                              ? 'border-green-500 bg-green-500/20' 
                              : 'border-transparent bg-black/20 hover:border-green-500/50'
                            : isSelected 
                              ? 'border-lumvale-primary bg-[#1e2336] thumbnail-active-glow'
                              : 'border-transparent bg-black/20 hover:border-lumvale-border'
                        }`}
                      >
                        {/* "Viewing" pill badge — only shown on the active thumbnail */}
                        {isSelected && !extractMode && (
                          <div
                            data-testid="thumbnail-viewing-badge"
                            className="absolute -top-2.5 left-2 z-20 flex items-center gap-1 bg-lumvale-primary text-[var(--color-lumvale-text)] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg select-none"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                            Viewing
                          </div>
                        )}

                        {onDelete && isEditMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(index);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-[var(--color-lumvale-text)] rounded-full w-6 h-6 flex items-center justify-center shadow-md z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Page"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {onRotate && isEditMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRotate(index);
                            }}
                            className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-[var(--color-lumvale-text)] rounded-full w-6 h-6 flex items-center justify-center shadow-md z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Rotate Page"
                          >
                            <RotateCw size={14} />
                          </button>
                        )}
                        {extractMode && isExtracted && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-[var(--color-lumvale-text)] rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md z-10">
                            ✓
                          </div>
                        )}
                        {/* Thumbnail */}
                        <div className="aspect-[1/1.4] w-full bg-white rounded flex items-center justify-center shadow-inner relative overflow-hidden pointer-events-none p-1">
                          <PDFCanvas
                            documentBytes={documentBytes}
                            pageNumber={pageNum}
                            scale={0.3}
                            renderPriority="low"
                            className="w-full h-full [&>canvas]:w-full [&>canvas]:h-full [&>canvas]:object-contain shadow-none"
                          />
                          <div className="absolute inset-0 border border-black/10 rounded"></div>
                        </div>
                        <div className={`text-center text-xs mt-2 font-medium transition-colors ${isSelected ? 'text-[var(--color-lumvale-text)] font-bold' : 'text-lumvale-muted'}`}>
                          Page {index + 1}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
