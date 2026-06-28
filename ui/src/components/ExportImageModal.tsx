import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { ImageFormat } from '../utils/exportImages';
import { parsePageRanges } from '../utils/pageRanges';

export interface ExportImageRequest {
  format: ImageFormat;
  /** Render scale relative to intrinsic PDF size (1 = 72 DPI). */
  scale: number;
  /** 1-based page positions in the current visual order. */
  visualPages: number[];
}

interface ExportImageModalProps {
  pageCount: number;
  currentPage: number;
  onExport: (
    req: ExportImageRequest,
    onProgress?: (done: number, total: number) => void,
  ) => Promise<void>;
  onClose: () => void;
}

const RESOLUTIONS = [
  { label: 'Screen (96 DPI)', scale: 96 / 72 },
  { label: 'Standard (150 DPI)', scale: 150 / 72 },
  { label: 'High (300 DPI)', scale: 300 / 72 },
];

export default function ExportImageModal({ pageCount, currentPage, onExport, onClose }: ExportImageModalProps) {
  const [format, setFormat] = useState<ImageFormat>('png');
  const [scope, setScope] = useState<'all' | 'current' | 'range'>('all');
  const [range, setRange] = useState('');
  const [resIndex, setResIndex] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const resolveVisualPages = (): number[] | null => {
    if (scope === 'all') return Array.from({ length: pageCount }, (_, i) => i + 1);
    if (scope === 'current') return [currentPage];
    return parsePageRanges(range, pageCount);
  };

  const handleExport = async () => {
    const visualPages = resolveVisualPages();
    if (!visualPages) {
      alert("Invalid page selection. Use a format like '1, 3, 5-7'.");
      return;
    }
    const scale = RESOLUTIONS[resIndex].scale;
    // Every rendered image is held in memory until the zip is built, so cost
    // grows with page count AND image area (∝ scale²). Warn before very large
    // jobs that could be slow or memory-heavy on this device.
    const cost = visualPages.length * scale * scale;
    if (
      cost > 900 &&
      !window.confirm(
        `Exporting ${visualPages.length} pages at this resolution renders them all in memory ` +
          `before building the download, which may be slow or memory-intensive. Continue?`,
      )
    ) {
      return;
    }
    setIsExporting(true);
    setProgress({ done: 0, total: visualPages.length });
    try {
      await onExport(
        { format, scale, visualPages },
        (done, total) => setProgress({ done, total }),
      );
      // onExport closes the modal on success.
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to export images.');
      setIsExporting(false);
      setProgress(null);
    }
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-lumvale-border bg-lumvale-surface/50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-lumvale-primary" />
            <h2 className="font-bold text-lg">Export to Image</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 hover:bg-[var(--color-lumvale-border)] rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-lumvale-muted">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['png', 'jpeg'] as ImageFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2 rounded text-sm font-semibold border transition-colors ${
                    format === f
                      ? 'bg-lumvale-primary text-[var(--color-lumvale-bg)] border-lumvale-primary'
                      : 'border-lumvale-border text-lumvale-muted hover:text-lumvale-text hover:border-lumvale-muted'
                  }`}
                >
                  {f === 'png' ? 'PNG' : 'JPG'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-lumvale-muted">
              {format === 'png' ? 'Lossless, supports transparency.' : 'Smaller files, white background.'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-lumvale-muted">Resolution</label>
            <select
              value={resIndex}
              onChange={(e) => setResIndex(Number(e.target.value))}
              className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
            >
              {RESOLUTIONS.map((r, i) => (
                <option key={r.label} value={i}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-lumvale-muted">Pages</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-lumvale-primary" />
                All pages ({pageCount})
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={scope === 'current'} onChange={() => setScope('current')} className="accent-lumvale-primary" />
                Current page ({currentPage})
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={scope === 'range'} onChange={() => setScope('range')} className="accent-lumvale-primary" />
                Custom range
              </label>
              {scope === 'range' && (
                <input
                  type="text"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder="e.g. 1, 3, 5-7"
                  className="w-full bg-lumvale-bg border border-lumvale-border rounded px-3 py-2 text-sm focus:outline-none focus:border-lumvale-primary transition-colors"
                />
              )}
            </div>
            <p className="text-[10px] text-lumvale-muted">Multiple pages are bundled into a .zip download.</p>
          </div>

          {isExporting && progress && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-lumvale-border rounded-full overflow-hidden">
                <div className="h-full bg-lumvale-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-lumvale-muted text-center">Rendering {progress.done} / {progress.total}…</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-lumvale-border bg-lumvale-surface/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded text-sm font-medium hover:bg-[var(--color-lumvale-border)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 rounded text-sm font-bold bg-lumvale-primary hover:bg-lumvale-primary/90 text-[var(--color-lumvale-bg)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting…
              </>
            ) : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
