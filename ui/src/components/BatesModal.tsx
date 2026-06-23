import React, { useState } from 'react';
import { X, Hash, Loader2 } from 'lucide-react';

interface BatesModalProps {
  pageCount: number;
  onApply: (options: {
    prefix?: string;
    suffix?: string;
    startNumber: number;
    numberOfDigits: number;
    fontSize: number;
    colorHex: string;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    marginX?: number;
    marginY?: number;
    pageIndices?: number[];
  }, onProgress?: (msg: string) => void) => Promise<void>;
  onClose: () => void;
}

export default function BatesModal({ pageCount, onApply, onClose }: BatesModalProps) {
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [numberOfDigits, setNumberOfDigits] = useState(6);
  const [fontSize, setFontSize] = useState(12);
  const [colorHex, setColorHex] = useState("#000000");
  const [position, setPosition] = useState<'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'>('bottom-right');
  const [marginX, setMarginX] = useState(30);
  const [marginY, setMarginY] = useState(30);
  
  const [targetPages, setTargetPages] = useState("all");
  const [isApplying, setIsApplying] = useState(false);
  const [progressMsg, setProgressMsg] = useState("Applying...");

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
    setProgressMsg("Applying...");
    
    try {
      await onApply({
        prefix,
        suffix,
        startNumber,
        numberOfDigits,
        fontSize,
        colorHex,
        position,
        marginX,
        marginY,
        pageIndices
      }, (msg) => setProgressMsg(msg));
      // onApply closes the modal via setShowBatesModal(false), so we don't
      // need to reset isApplying here — the component is already unmounted.
    } catch (err) {
      // Only reset if the component is still mounted (i.e., onApply threw
      // before closing the modal)
      setIsApplying(false);
      console.error('Apply failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-lumvale-border bg-lumvale-surface/50">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-lumvale-primary" />
            <h2 className="font-bold text-lg">Page Numbering</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Prefix</label>
              <input 
                type="text" 
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                placeholder="e.g. EXH-"
              />
              <p className="text-[10px] text-lumvale-muted mt-1">Leave blank for just numbers</p>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Suffix</label>
              <input 
                type="text" 
                value={suffix}
                onChange={e => setSuffix(e.target.value)}
                className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                placeholder="e.g. -A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Start Number</label>
              <input 
                type="number" 
                min="1"
                value={startNumber}
                onChange={e => setStartNumber(Number(e.target.value))}
                className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Digits</label>
              <input 
                type="number" 
                min="1" max="10"
                value={numberOfDigits}
                onChange={e => setNumberOfDigits(Number(e.target.value))}
                className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
              />
            </div>
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
                min="8" max="72" 
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-lumvale-primary"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-lumvale-border">
            <h3 className="text-sm font-semibold text-lumvale-primary">Positioning</h3>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-lumvale-muted">Anchor Position</label>
              <select 
                value={position}
                onChange={e => setPosition(e.target.value as any)}
                className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-lumvale-muted">Margin X ({marginX}px)</label>
                <input 
                  type="number" 
                  min="0" 
                  value={marginX}
                  onChange={e => setMarginX(Number(e.target.value))}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-lumvale-muted">Margin Y ({marginY}px)</label>
                <input 
                  type="number" 
                  min="0" 
                  value={marginY}
                  onChange={e => setMarginY(Number(e.target.value))}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
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
            disabled={isApplying}
            className="px-4 py-2 rounded text-sm font-bold bg-lumvale-primary hover:bg-lumvale-primary/90 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progressMsg}
              </>
            ) : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
