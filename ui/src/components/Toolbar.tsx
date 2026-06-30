import { PanelLeft, Files, Scissors, SplitSquareHorizontal, Minimize, Info, Lock, ZoomIn, ZoomOut, Pencil, Eye, LayoutGrid, FileDigit, PanelTop, StretchHorizontal, Columns2, Ruler, Grid2x2 } from 'lucide-react';

/** State + handlers for the in-toolbar view-aid toggles (dual page / ruler / grid). */
export interface ViewAidControls {
  dualPage: boolean;
  showRuler: boolean;
  showGrid: boolean;
  onToggleDual: () => void;
  onToggleRuler: () => void;
  onToggleGrid: () => void;
}

interface ToolbarProps {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onExport: () => void;
  onOpen?: () => void;
  onMerge: () => void;
  onExtract: () => void;
  extractMode: boolean;
  onSplit: () => void;
  onCompress: () => void;
  onWatermark: () => void;
  onBates: () => void;
  onHeadersFooters: () => void;
  isCompressing: boolean;
  onMetadata: () => void;
  onEncrypt: () => void;
  zoom: number;
  /** Internal scale presented to the user as 100%. Keep in sync with the host's
   *  zoom math (Workspace.BASE_ZOOM); defaults to 1.5 for standalone use. */
  baseZoom?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset?: () => void;
  onFitWidth?: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  annotateMode: boolean;
  onToggleAnnotate: () => void;
  isOrganizeMode: boolean;
  onOrganize: () => void;
  /** Small-screen "limited edit": hide the heavy/multi-step tools (merge,
   *  compress, Bates, headers/footers, organizer, split, extract, metadata,
   *  encrypt). View + annotate + page delete/rotate remain. */
  compact?: boolean;
  customToolbarLeft?: React.ReactNode;
  customToolbarCenter?: React.ReactNode;
  customToolbarRight?: React.ReactNode;
  /** Dual-page / ruler / grid toggles, rendered inline in the toolbar. */
  viewAids?: ViewAidControls;
}

export default function Toolbar({
  showSidebar,
  onToggleSidebar,
  onExport,
  onOpen,
  onMerge,
  onExtract,
  extractMode,
  onSplit,
  onCompress,
  onWatermark,
  onBates,
  onHeadersFooters,
  isCompressing,
  onMetadata,
  onEncrypt,
  zoom,
  baseZoom = 1.5,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitWidth,
  isEditMode,
  onToggleEditMode,
  annotateMode,
  onToggleAnnotate,
  isOrganizeMode,
  onOrganize,
  compact = false,
  customToolbarLeft,
  customToolbarCenter,
  customToolbarRight,
  viewAids
}: ToolbarProps) {
  return (
    <div className="h-12 bg-[var(--color-lumvale-surface)]/70 backdrop-blur-md border-b border-[var(--color-lumvale-border)] flex items-center px-3 gap-2 relative z-40">
      <button 
        onClick={onToggleSidebar}
        className={`p-1.5 rounded transition-colors ${showSidebar ? 'bg-[var(--color-lumvale-primary)] text-[var(--color-lumvale-bg)]' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
        title="Toggle Sidebar"
      >
        <PanelLeft size={20} />
      </button>

      {customToolbarLeft}

      <div className="w-px h-6 bg-[var(--color-lumvale-border)] mx-1"></div>

      {!compact && (
        <>
          <button
            onClick={onExtract}
            className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${extractMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
            title="Extract Pages"
          >
            <Scissors size={18} />
          </button>

          <button
            onClick={onSplit}
            className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] flex items-center gap-1.5"
            title="Split Document"
          >
            <SplitSquareHorizontal size={18} />
          </button>
        </>
      )}

      {/* Annotate is available regardless of Edit Mode — comments are additive
          and not committed until save. */}
      <button
        onClick={onToggleAnnotate}
        className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${annotateMode ? 'bg-lumvale-accent/20 text-lumvale-accent border border-lumvale-accent/30' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
        title="Annotate Document"
      >
        <Pencil size={18} />
      </button>

      {isEditMode && (
        <>
          {!compact && (
            <>
              <button
                onClick={onMerge}
                className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] flex items-center gap-1.5"
                title="Merge Document"
              >
                <Files size={18} />
              </button>

              <button
                onClick={onCompress}
                disabled={isCompressing}
                className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${isCompressing ? 'opacity-50 cursor-not-allowed text-[var(--color-lumvale-muted)]' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
                title="Compress / Optimize"
              >
                <Minimize size={18} />
              </button>

              <button
                onClick={onBates}
                className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] flex items-center gap-1.5"
                title="Page Numbering"
              >
                <FileDigit size={18} />
              </button>

              <button
                onClick={onHeadersFooters}
                className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] flex items-center gap-1.5"
                title="Headers & Footers"
              >
                <PanelTop size={18} />
              </button>
            </>
          )}

          {!compact && (
            <button
              onClick={onOrganize}
              className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${isOrganizeMode ? 'bg-lumvale-primary text-[var(--color-lumvale-bg)] border border-lumvale-primary' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
              title="Visual Page Organizer"
            >
              <LayoutGrid size={18} />
            </button>
          )}

          {customToolbarCenter}

          {!compact && (
            <>
              <div className="w-px h-6 bg-[var(--color-lumvale-border)] mx-1"></div>

              <button
                onClick={onMetadata}
                className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] flex items-center gap-1.5"
                title="Edit Metadata"
              >
                <Info size={18} />
              </button>

              <button
                onClick={onEncrypt}
                className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] flex items-center gap-1.5"
                title="Encrypt / Lock"
              >
                <Lock size={18} />
              </button>
            </>
          )}

          <div className="w-px h-6 bg-[var(--color-lumvale-border)] mx-1"></div>
        </>
      )}

      <button 
        onClick={onZoomOut}
        className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]"
        title="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      
      <button
        onClick={onZoomReset}
        className="text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] text-sm font-semibold w-12 text-center select-none rounded transition-colors"
        title="Reset zoom to 100%"
      >
        {Math.round((zoom / baseZoom) * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]"
        title="Zoom In"
      >
        <ZoomIn size={18} />
      </button>

      {onFitWidth && (
        <button
          onClick={onFitWidth}
          className="p-1.5 rounded transition-colors text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]"
          title="Fit Width"
        >
          <StretchHorizontal size={18} />
        </button>
      )}

      {customToolbarRight}

      {viewAids && (
        <>
          <div className="w-px h-6 bg-[var(--color-lumvale-border)] mx-1"></div>
          {([
            [Columns2, 'Dual', viewAids.dualPage, viewAids.onToggleDual, 'Side-by-side pages'],
            [Ruler, 'Ruler', viewAids.showRuler, viewAids.onToggleRuler, 'Toggle ruler'],
            [Grid2x2, 'Grid', viewAids.showGrid, viewAids.onToggleGrid, 'Toggle grid'],
          ] as const).map(([Icon, label, active, onClick, title]) => (
            <button
              key={label}
              onClick={onClick}
              title={title}
              aria-pressed={active}
              aria-label={`toggle-${label.toLowerCase()}`}
              className={`px-2 py-1.5 rounded transition-colors flex items-center gap-1.5 text-xs ${active ? 'bg-[var(--color-lumvale-primary)] text-[var(--color-lumvale-bg)]' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </>
      )}

      <div className="flex-1"></div>

      <button 
        onClick={onToggleEditMode}
        className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold shadow transition-colors border mr-2 ${isEditMode ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30' : 'bg-transparent text-[var(--color-lumvale-muted)] border-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)] hover:border-[var(--color-lumvale-muted)]'}`}
        title="Toggle Edit Mode"
      >
        {isEditMode ? (
          <>
            <Pencil size={16} />
            Edit Mode
          </>
        ) : (
          <>
            <Eye size={16} />
            Read-Only
          </>
        )}
      </button>
    </div>
  );
}
