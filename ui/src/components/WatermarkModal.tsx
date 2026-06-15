import React, { useState } from 'react';
import { X, Stamp } from 'lucide-react';

interface WatermarkModalProps {
  pageCount: number;
  onApply: (options: {
    text: string;
    fontSize: number;
    opacity: number;
    angle: number;
    colorHex: string;
    pageIndices?: number[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function WatermarkModal({ pageCount, onApply, onClose }: WatermarkModalProps) {
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [angle, setAngle] = useState(45);
  const [colorHex, setColorHex] = useState("#FF0000");
  
  const [targetPages, setTargetPages] = useState("all");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    let pageIndices: number[] | undefined = undefined;
    
    if (targetPages.trim().toLowerCase() !== 'all') {
      const indices = new Set<number>();
      const parts = targetPages.split(',');
      for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n, 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= pageCount) indices.add(i - 1);
            }
          }
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num) && num >= 1 && num <= pageCount) {
            indices.add(num - 1);
          }
        }
      }
      
      if (indices.size === 0) {
        alert("Invalid page selection. Please specify pages like '1, 3, 5-7' or 'all'.");
        return;
      }
      pageIndices = Array.from(indices);
    }
    
    setIsApplying(true);
    await onApply({
      text,
      fontSize,
      opacity,
      angle,
      colorHex,
      pageIndices
    });
    setIsApplying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-lumvale-border bg-lumvale-surface/50">
          <div className="flex items-center gap-2">
            <Stamp className="w-5 h-5 text-lumvale-primary" />
            <h2 className="font-bold text-lg">Add Watermark</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1">
            <label className="text-sm font-medium text-lumvale-muted">Watermark Text</label>
            <input 
              type="text" 
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
              placeholder="e.g. DRAFT"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={colorHex}
                  onChange={e => setColorHex(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent p-0"
                />
                <span className="text-sm uppercase font-mono">{colorHex}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Size ({fontSize}pt)</label>
              <input 
                type="range" 
                min="12" max="144" 
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-lumvale-primary"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Opacity ({Math.round(opacity * 100)}%)</label>
              <input 
                type="range" 
                min="0.05" max="1" step="0.05"
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                className="w-full accent-lumvale-primary"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Angle ({angle}°)</label>
              <input 
                type="range" 
                min="-180" max="180" 
                value={angle}
                onChange={e => setAngle(Number(e.target.value))}
                className="w-full accent-lumvale-primary"
              />
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-lumvale-border">
            <label className="text-sm font-medium text-lumvale-muted">Pages to Apply To</label>
            <input 
              type="text" 
              value={targetPages}
              onChange={e => setTargetPages(e.target.value)}
              className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
              placeholder="e.g. all, or 1, 3, 5-7"
            />
            <p className="text-xs text-lumvale-muted/70">Enter "all" or specific pages like "1, 3, 5-7". Total pages: {pageCount}</p>
          </div>
        </div>
        
        <div className="p-4 border-t border-lumvale-border bg-lumvale-surface/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleApply}
            disabled={isApplying || !text}
            className="px-4 py-2 rounded text-sm font-bold bg-lumvale-primary hover:bg-lumvale-primary/90 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isApplying ? "Applying..." : "Apply Watermark"}
          </button>
        </div>
      </div>
    </div>
  );
}
