import { motion } from 'framer-motion';
import type { AnnotationType } from './AnnotationOverlay';
import { PenTool, Highlighter, Type, Trash2, X, MousePointer2, Square } from 'lucide-react';

interface AnnotationToolbarProps {
  activeTool: AnnotationType | null;
  onToolSelect: (tool: AnnotationType | null) => void;
  activeColor: string;
  onColorSelect: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthSelect: (width: number) => void;
  onClearAnnotations: () => void;
  onClose: () => void;
  hasPendingAnnotations: boolean;
  customEditTools?: React.ReactNode;
}

const COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#4CD964', // Green
  '#5AC8FA', // Light Blue
  '#007AFF', // Blue
  '#5856D6', // Purple
  '#000000', // Black
];

export default function AnnotationToolbar({
  activeTool,
  onToolSelect,
  activeColor,
  onColorSelect,
  strokeWidth,
  onStrokeWidthSelect,
  onClearAnnotations,
  onClose,
  hasPendingAnnotations,
  customEditTools,
}: AnnotationToolbarProps) {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-vault-panel/80 backdrop-blur-md border-b border-[var(--color-lumvale-border)] p-2 flex items-center justify-between"
    >
      <div className="flex items-center space-x-4">
        {/* Tools */}
        <div className="flex items-center space-x-1 bg-black/20 p-1 rounded-lg">
          
          <button 
            onClick={() => onToolSelect(activeTool === 'ink' ? null : 'ink')}
            className={`p-2 rounded-md transition-colors flex items-center justify-center ${activeTool === 'ink' ? 'bg-[var(--color-lumvale-primary)] text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-border)]'}`}
            title="Pen Tool"
          >
            <PenTool size={18} />
          </button>
          <button 
            onClick={() => onToolSelect(activeTool === 'highlight' ? null : 'highlight')}
            className={`p-2 rounded-md transition-colors flex items-center justify-center ${activeTool === 'highlight' ? 'bg-[var(--color-lumvale-primary)] text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-border)]'}`}
            title="Highlighter"
          >
            <Highlighter size={18} />
          </button>
          <button 
            onClick={() => onToolSelect(activeTool === 'text' ? null : 'text')}
            className={`p-2 rounded-md transition-colors flex items-center justify-center ${activeTool === 'text' ? 'bg-[var(--color-lumvale-primary)] text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-border)]'}`}
            title="Text Tool"
          >
            <Type size={18} />
          </button>
          <button 
            onClick={() => onToolSelect(activeTool === 'redact' ? null : 'redact')}
            className={`p-2 rounded-md transition-colors flex items-center justify-center ${activeTool === 'redact' ? 'bg-red-500 text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] hover:bg-red-500/20'}`}
            title="Redact Tool"
          >
            <Square size={18} fill={activeTool === 'redact' ? 'currentColor' : 'none'} />
          </button>
          {customEditTools}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-white/20"></div>

        {/* Colors */}
        <div className="flex items-center space-x-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => onColorSelect(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
              title={`Color ${c}`}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-white/20"></div>

        {/* Stroke width */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[var(--color-lumvale-muted)]">Size</span>
          <input 
            type="range" 
            min="1" 
            max="12" 
            value={strokeWidth} 
            onChange={(e) => onStrokeWidthSelect(parseInt(e.target.value))}
            className="w-24 accent-vault-primary"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button 
          onClick={onClearAnnotations}
          className="text-xs flex items-center space-x-1 text-[var(--color-lumvale-muted)] hover:text-red-400 transition-colors px-2 py-1"
          disabled={!hasPendingAnnotations}
          title="Clear pending annotations"
        >
          <Trash2 size={14} />
          <span>Clear All</span>
        </button>

        <button 
          onClick={onClose}
          className="p-1.5 text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] rounded-md hover:bg-[var(--color-lumvale-border)] transition-colors"
          title="Close Annotation Mode"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
