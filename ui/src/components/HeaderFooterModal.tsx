import React, { useState } from 'react';
import { X, PanelTop } from 'lucide-react';

interface HeaderFooterModalProps {
  pageCount: number;
  onApply: (options: {
    headerLeft?: string;
    headerCenter?: string;
    headerRight?: string;
    footerLeft?: string;
    footerCenter?: string;
    footerRight?: string;
    fontSize: number;
    colorHex: string;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    pageIndices?: number[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function HeaderFooterModal({ pageCount, onApply, onClose }: HeaderFooterModalProps) {
  const [headerLeft, setHeaderLeft] = useState("");
  const [headerCenter, setHeaderCenter] = useState("");
  const [headerRight, setHeaderRight] = useState("");
  const [footerLeft, setFooterLeft] = useState("");
  const [footerCenter, setFooterCenter] = useState("");
  const [footerRight, setFooterRight] = useState("");
  
  const [fontSize, setFontSize] = useState(10);
  const [colorHex, setColorHex] = useState("#000000");
  const [marginTop, setMarginTop] = useState(30);
  const [marginBottom, setMarginBottom] = useState(30);
  const [marginLeft, setMarginLeft] = useState(30);
  const [marginRight, setMarginRight] = useState(30);
  
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
      headerLeft,
      headerCenter,
      headerRight,
      footerLeft,
      footerCenter,
      footerRight,
      fontSize,
      colorHex,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      pageIndices
    });
    setIsApplying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-lumvale-border bg-lumvale-surface/50">
          <div className="flex items-center gap-2">
            <PanelTop className="w-5 h-5 text-lumvale-primary" />
            <h2 className="font-bold text-lg">Headers & Footers</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-lumvale-border)] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          <div className="text-sm text-lumvale-muted bg-lumvale-surface/30 p-3 rounded border border-lumvale-border">
            <strong>Supported tokens:</strong> {"{pageNumber}"}, {"{totalPages}"}, {"{date}"}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lumvale-primary">Header</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Left</label>
                <input 
                  type="text" 
                  value={headerLeft}
                  onChange={e => setHeaderLeft(e.target.value)}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Center</label>
                <input 
                  type="text" 
                  value={headerCenter}
                  onChange={e => setHeaderCenter(e.target.value)}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Right</label>
                <input 
                  type="text" 
                  value={headerRight}
                  onChange={e => setHeaderRight(e.target.value)}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lumvale-primary">Footer</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Left</label>
                <input 
                  type="text" 
                  value={footerLeft}
                  onChange={e => setFooterLeft(e.target.value)}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Center</label>
                <input 
                  type="text" 
                  value={footerCenter}
                  onChange={e => setFooterCenter(e.target.value)}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Right</label>
                <input 
                  type="text" 
                  value={footerRight}
                  onChange={e => setFooterRight(e.target.value)}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-lumvale-border pt-4">
            <h3 className="font-semibold text-lumvale-primary mb-3">Appearance & Position</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Font Size ({fontSize}pt)</label>
                <input 
                  type="number" 
                  min="6" max="72" 
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-2 py-1 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                    className="w-6 h-6 rounded border-none cursor-pointer bg-transparent p-0"
                  />
                  <span className="text-xs uppercase font-mono">{colorHex}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Top Margin</label>
                <input 
                  type="number" 
                  min="0"
                  value={marginTop}
                  onChange={e => setMarginTop(Number(e.target.value))}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-2 py-1 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-lumvale-muted">Bottom Margin</label>
                <input 
                  type="number" 
                  min="0"
                  value={marginBottom}
                  onChange={e => setMarginBottom(Number(e.target.value))}
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-2 py-1 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
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
          </div>
        </div>
        
        <div className="p-4 border-t border-lumvale-border bg-lumvale-surface/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium hover:bg-[var(--color-lumvale-border)] transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleApply}
            disabled={isApplying}
            className="px-4 py-2 rounded text-sm font-bold bg-lumvale-primary hover:bg-lumvale-primary/90 text-[var(--color-lumvale-bg)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isApplying ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
