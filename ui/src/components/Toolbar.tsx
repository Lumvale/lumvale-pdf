import { PanelLeft, Files, Scissors, SplitSquareHorizontal, Minimize, Info, Lock, Download, ZoomIn, ZoomOut, Pencil, Eye, LayoutGrid, FileDigit, PanelTop } from 'lucide-react';

interface ToolbarProps {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onExport: () => void;
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
  onZoomIn: () => void;
  onZoomOut: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  annotateMode: boolean;
  onToggleAnnotate: () => void;
  isOrganizeMode: boolean;
  onOrganize: () => void;
}

export default function Toolbar({
  showSidebar,
  onToggleSidebar,
  onExport,
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
  onZoomIn,
  onZoomOut,
  isEditMode,
  onToggleEditMode,
  annotateMode,
  onToggleAnnotate,
  isOrganizeMode,
  onOrganize
}: ToolbarProps) {
  return (
    <div className="h-12 bg-vault-surface/70 backdrop-blur-md border-b border-vault-border flex items-center px-3 gap-2 relative z-40">
      <button 
        onClick={onToggleSidebar}
        className={`p-1.5 rounded transition-colors ${showSidebar ? 'bg-vault-primary text-white' : 'text-vault-muted hover:bg-vault-border hover:text-white'}`}
        title="Toggle Sidebar"
      >
        <PanelLeft size={20} />
      </button>

      <div className="w-px h-6 bg-vault-border mx-1"></div>

      <button 
        onClick={onExtract}
        className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${extractMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-vault-muted hover:bg-vault-border hover:text-white'}`}
        title="Extract Pages"
      >
        <Scissors size={18} />
      </button>

      <button 
        onClick={onSplit}
        className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white flex items-center gap-1.5"
        title="Split Document"
      >
        <SplitSquareHorizontal size={18} />
      </button>

      {isEditMode && (
        <>
          <button 
            onClick={onMerge}
            className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white flex items-center gap-1.5"
            title="Merge Document"
          >
            <Files size={18} />
          </button>

          <button 
            onClick={onCompress}
            disabled={isCompressing}
            className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${isCompressing ? 'opacity-50 cursor-not-allowed text-vault-muted' : 'text-vault-muted hover:bg-vault-border hover:text-white'}`}
            title="Compress / Optimize"
          >
            <Minimize size={18} />
          </button>

          <button 
            onClick={onBates}
            className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white flex items-center gap-1.5"
            title="Page Numbering"
          >
            <FileDigit size={18} />
          </button>

          <button 
            onClick={onHeadersFooters}
            className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white flex items-center gap-1.5"
            title="Headers & Footers"
          >
            <PanelTop size={18} />
          </button>

          <button 
            onClick={onToggleAnnotate}
            className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${annotateMode ? 'bg-vault-accent/20 text-vault-accent border border-vault-accent/30' : 'text-vault-muted hover:bg-vault-border hover:text-white'}`}
            title="Annotate Document"
          >
            <Pencil size={18} />
          </button>

          <button 
            onClick={onOrganize}
            className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${isOrganizeMode ? 'bg-lumvale-primary text-white border border-lumvale-primary' : 'text-vault-muted hover:bg-vault-border hover:text-white'}`}
            title="Visual Page Organizer"
          >
            <LayoutGrid size={18} />
          </button>

          <div className="w-px h-6 bg-vault-border mx-1"></div>

          <button 
            onClick={onMetadata}
            className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white flex items-center gap-1.5"
            title="Edit Metadata"
          >
            <Info size={18} />
          </button>

          <button 
            onClick={onEncrypt}
            className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white flex items-center gap-1.5"
            title="Encrypt / Lock"
          >
            <Lock size={18} />
          </button>

          <div className="w-px h-6 bg-vault-border mx-1"></div>
        </>
      )}

      <button 
        onClick={onZoomOut}
        className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white"
        title="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      
      <span className="text-vault-muted text-sm font-semibold w-12 text-center select-none">
        {Math.round(zoom * 100 / 1.5)}%
      </span>

      <button 
        onClick={onZoomIn}
        className="p-1.5 rounded transition-colors text-vault-muted hover:bg-vault-border hover:text-white"
        title="Zoom In"
      >
        <ZoomIn size={18} />
      </button>

      <div className="flex-1"></div>

      <button 
        onClick={onToggleEditMode}
        className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold shadow transition-colors border mr-2 ${isEditMode ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30' : 'bg-transparent text-vault-muted border-vault-border hover:text-white hover:border-vault-muted'}`}
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
