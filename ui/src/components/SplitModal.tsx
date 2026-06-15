import { useState } from 'react';
import { LumvalePDFEngine } from '@lumvalepdf/core';
import JSZip from 'jszip';
import { X } from 'lucide-react';

interface SplitModalProps {
  documentBytes: Uint8Array;
  pageCount: number;
  onClose: () => void;
}

export default function SplitModal({ documentBytes, pageCount, onClose }: SplitModalProps) {
  const [splitMode, setSplitMode] = useState<'single' | 'fixed' | 'custom'>('single');
  const [fixedPages, setFixedPages] = useState<number>(2);
  const [customRanges, setCustomRanges] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSplit = async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      const zip = new JSZip();

      if (splitMode === 'single') {
        for (let i = 0; i < pageCount; i++) {
          const singleDoc = await engine.extractPages([i]);
          const bytes = await singleDoc.save();
          zip.file(`Page_${i + 1}.pdf`, bytes);
          setProgress(((i + 1) / pageCount) * 100);
        }
      } else if (splitMode === 'fixed') {
        const x = Math.max(1, fixedPages);
        let part = 1;
        for (let i = 0; i < pageCount; i += x) {
          const end = Math.min(i + x, pageCount);
          const indices = Array.from({ length: end - i }, (_, k) => i + k);
          const splitDoc = await engine.extractPages(indices);
          const bytes = await splitDoc.save();
          zip.file(`Part_${part}_Pages_${i + 1}-${end}.pdf`, bytes);
          part++;
          setProgress((end / pageCount) * 100);
        }
      } else if (splitMode === 'custom') {
        const ranges = customRanges.split(',').map(r => r.trim()).filter(r => r);
        if (ranges.length === 0) throw new Error("No ranges specified");

        for (let i = 0; i < ranges.length; i++) {
          const rangeStr = ranges[i];
          const parts = rangeStr.split('-');
          let start = 0;
          let end = 0;

          if (parts.length === 1) {
            start = parseInt(parts[0], 10);
            end = start;
          } else if (parts.length === 2) {
            start = parseInt(parts[0], 10);
            end = parseInt(parts[1], 10);
          }

          if (isNaN(start) || isNaN(end) || start < 1 || end < start || start > pageCount) {
            continue; // Skip invalid ranges
          }

          end = Math.min(end, pageCount);

          const indices = Array.from({ length: end - start + 1 }, (_, k) => (start - 1) + k);
          const splitDoc = await engine.extractPages(indices);
          const bytes = await splitDoc.save();
          zip.file(`Pages_${start}-${end}.pdf`, bytes);
          setProgress(((i + 1) / ranges.length) * 100);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lumvalepdf-split.zip';
      a.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to split document. Please check your inputs.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-lumvale-text">
      <div className="bg-lumvale-surface rounded-lg shadow-2xl border border-lumvale-border w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-lumvale-border">
          <h2 className="text-lg font-bold">Split PDF Document</h2>
          <button onClick={onClose} className="text-lumvale-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                value="single"
                checked={splitMode === 'single'}
                onChange={() => setSplitMode('single')}
                className="w-4 h-4 text-lumvale-primary focus:ring-lumvale-primary focus:ring-offset-lumvale-surface bg-lumvale-surface border-lumvale-border"
              />
              <span className="text-sm font-medium">Split into Single Pages</span>
            </label>
            <p className="text-xs text-lumvale-muted ml-7">Creates a separate PDF file for every single page in the document.</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                value="fixed"
                checked={splitMode === 'fixed'}
                onChange={() => setSplitMode('fixed')}
                className="w-4 h-4 text-lumvale-primary focus:ring-lumvale-primary focus:ring-offset-lumvale-surface bg-lumvale-surface border-lumvale-border"
              />
              <span className="text-sm font-medium">Split Every X Pages</span>
            </label>
            {splitMode === 'fixed' && (
              <div className="ml-7 flex items-center space-x-3">
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={fixedPages}
                  onChange={(e) => setFixedPages(parseInt(e.target.value) || 1)}
                  className="w-20 bg-[#05070A] border border-lumvale-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-lumvale-primary"
                />
                <span className="text-xs text-lumvale-muted">pages per file</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                value="custom"
                checked={splitMode === 'custom'}
                onChange={() => setSplitMode('custom')}
                className="w-4 h-4 text-lumvale-primary focus:ring-lumvale-primary focus:ring-offset-lumvale-surface bg-lumvale-surface border-lumvale-border"
              />
              <span className="text-sm font-medium">Custom Ranges</span>
            </label>
            {splitMode === 'custom' && (
              <div className="ml-7 space-y-1">
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5-7, 9"
                  value={customRanges}
                  onChange={(e) => setCustomRanges(e.target.value)}
                  className="w-full bg-[#05070A] border border-lumvale-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-lumvale-primary"
                />
                <p className="text-xs text-lumvale-muted">Enter comma-separated ranges. Pages outside these ranges will be ignored.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-lumvale-border flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-lumvale-muted hover:text-white transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            onClick={handleSplit}
            disabled={isProcessing}
            className="px-4 py-2 rounded text-sm bg-lumvale-primary text-white font-bold hover:bg-lumvale-primary/90 transition-colors disabled:opacity-50 min-w-[120px]"
          >
            {isProcessing ? `Splitting ${Math.round(progress)}%` : 'Split & Download ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
