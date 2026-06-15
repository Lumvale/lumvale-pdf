import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface PageItem {
  id: string; // unique ID like "doc1-page1"
  docId: 'primary' | 'secondary';
  pageIndex: number;
}

interface MergeWorkspaceProps {
  primaryPageCount: number;
  secondaryPageCount: number;
  onApplyMerge: (sequence: { docId: 'primary' | 'secondary'; pageIndex: number }[]) => void;
  onCancel: () => void;
}

export default function MergeWorkspace({ primaryPageCount, secondaryPageCount, onApplyMerge, onCancel }: MergeWorkspaceProps) {
  const [primaryPages, setPrimaryPages] = useState<PageItem[]>([]);
  const [secondaryPages, setSecondaryPages] = useState<PageItem[]>([]);

  // Initialize pages on mount
  useEffect(() => {
    setPrimaryPages(
      Array.from({ length: primaryPageCount }, (_, i) => ({ id: `primary-${i}`, docId: 'primary', pageIndex: i }))
    );
    setSecondaryPages(
      Array.from({ length: secondaryPageCount }, (_, i) => ({ id: `secondary-${i}`, docId: 'secondary', pageIndex: i }))
    );
  }, [primaryPageCount, secondaryPageCount]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    // Moving within the same list
    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'primary-list') {
        const items = Array.from(primaryPages);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);
        setPrimaryPages(items);
      } else {
        const items = Array.from(secondaryPages);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);
        setSecondaryPages(items);
      }
    } else {
      // Moving between lists
      if (source.droppableId === 'secondary-list' && destination.droppableId === 'primary-list') {
        const sourceClone = Array.from(secondaryPages);
        const destClone = Array.from(primaryPages);
        const [movedItem] = sourceClone.splice(source.index, 1);
        destClone.splice(destination.index, 0, movedItem);
        setSecondaryPages(sourceClone);
        setPrimaryPages(destClone);
      } else if (source.droppableId === 'primary-list' && destination.droppableId === 'secondary-list') {
        const sourceClone = Array.from(primaryPages);
        const destClone = Array.from(secondaryPages);
        const [movedItem] = sourceClone.splice(source.index, 1);
        destClone.splice(destination.index, 0, movedItem);
        setPrimaryPages(sourceClone);
        setSecondaryPages(destClone);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-lumvale-bg text-lumvale-text">
      <div className="p-4 bg-lumvale-surface border-b border-lumvale-border flex justify-between items-center shadow-md z-10">
        <h2 className="text-xl font-bold text-lumvale-accent">Dual-Pane Merge Workspace</h2>
        <div className="space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-lumvale-border hover:bg-red-500 hover:text-white rounded transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => onApplyMerge(primaryPages.map(p => ({ docId: p.docId, pageIndex: p.pageIndex })))}
            className="px-6 py-2 bg-gradient-to-r from-lumvale-primary to-lumvale-accent hover:opacity-90 font-bold rounded shadow-lg transition-opacity"
          >
            Apply Merge
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          {/* Primary Document Pane */}
          <div className="w-1/2 flex flex-col border-r border-lumvale-border">
            <div className="p-3 bg-black/20 text-center font-bold text-lumvale-muted">Working Document</div>
            <Droppable droppableId="primary-list">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef} 
                  data-testid="primary-list"
                  className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-4 content-start"
                >
                  {primaryPages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          data-testid={page.id}
                          className="aspect-[1/1.4] bg-white rounded shadow-md border-2 border-lumvale-primary flex flex-col items-center justify-center relative select-none cursor-grab active:cursor-grabbing"
                        >
                          <span className="text-gray-400 font-bold text-2xl">{page.pageIndex + 1}</span>
                          <span className="text-[10px] text-gray-400 mt-2 absolute bottom-2">{page.docId}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Secondary Document Pane */}
          <div className="w-1/2 flex flex-col">
            <div className="p-3 bg-black/20 text-center font-bold text-lumvale-muted">Source Document</div>
            <Droppable droppableId="secondary-list">
              {(provided) => (
                  <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef} 
                  data-testid="secondary-list"
                  className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-4 content-start bg-[#121622]"
                >
                  {secondaryPages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          data-testid={page.id}
                          className="group aspect-[1/1.4] bg-gray-200 rounded shadow-md border-2 border-transparent hover:border-lumvale-accent flex flex-col items-center justify-center relative select-none cursor-grab active:cursor-grabbing opacity-80"
                        >
                          <span className="text-gray-500 font-bold text-2xl">{page.pageIndex + 1}</span>
                          <span className="text-[10px] text-gray-500 mt-2 absolute bottom-2">{page.docId}</span>
                          
                          {/* Accessibility/Quick Add Button */}
                          <button
                            onClick={() => {
                              const sourceClone = Array.from(secondaryPages);
                              const destClone = Array.from(primaryPages);
                              const [movedItem] = sourceClone.splice(index, 1);
                              destClone.push(movedItem);
                              setSecondaryPages(sourceClone);
                              setPrimaryPages(destClone);
                            }}
                            className="absolute top-2 right-2 bg-lumvale-primary text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
                            title="Add to Working Document"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
