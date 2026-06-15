import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Trash2, RotateCw } from 'lucide-react';
import PDFCanvas from './PDFCanvas';

interface OrganizerGridProps {
  documentBytes: Uint8Array;
  pageOrder: number[];
  onReorder: (startIndex: number, endIndex: number) => void;
  onDelete: (index: number) => void;
  onRotate: (index: number) => void;
}

export default function OrganizerGrid({
  documentBytes,
  pageOrder,
  onReorder,
  onDelete,
  onRotate
}: OrganizerGridProps) {
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-lumvale-surface p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Organize Pages</h2>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="organizer-grid" direction="horizontal">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-wrap gap-6"
              >
                {pageOrder.map((pageNum, index) => (
                  <Draggable key={`org-${pageNum}`} draggableId={`org-${pageNum}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`relative group bg-lumvale-bg border-2 rounded-xl p-3 flex flex-col items-center transition-shadow
                          ${snapshot.isDragging ? 'shadow-2xl border-lumvale-accent z-50' : 'border-lumvale-border hover:border-lumvale-primary'}
                        `}
                        style={{
                          ...provided.draggableProps.style,
                        }}
                      >
                        <div className="text-xs text-lumvale-muted font-bold mb-2">Page {index + 1}</div>
                        
                        <div className="relative w-32 h-40 flex items-center justify-center overflow-hidden bg-white/5 rounded">
                          <PDFCanvas 
                            documentBytes={documentBytes}
                            pageNumber={pageNum}
                            scale={0.5} // Small scale for thumbnails
                            className="pointer-events-none drop-shadow-md"
                          />
                        </div>

                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-lumvale-bg/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3 backdrop-blur-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); onRotate(index); }}
                            className="p-2 bg-lumvale-primary hover:bg-lumvale-primary/80 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                            title="Rotate Page"
                          >
                            <RotateCw size={18} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                            title="Delete Page"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
