import { useState, useRef, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { toggleTheme, isDarkMode } from '../utils/theme';

interface TopBarProps {
  onExport: () => void;
  onMerge: () => void;
  onExtract: () => void;
  onSplit: () => void;
  onCompress: () => void;
  onWatermark: () => void;
  onMetadata: () => void;
  onEncrypt: () => void;
  onCheckUpdates: () => void;
  isCompressing: boolean;
  isEditMode: boolean;
  onShowInstall?: () => void;
  onCloseDocument?: () => void;
  onSave?: () => void;
}

/**
 * TopBar renders the topmost navigation and application menu for LumvalePDF.
 * In the Electron context, this bar handles window dragging (`-webkit-app-region: drag`) 
 * since the native title bar is hidden via Window Controls Overlay.
 *
 * @param {TopBarProps} props Callbacks for various document operations and states.
 */
export default function TopBar({
  onExport,
  onMerge,
  onExtract,
  onSplit,
  onCompress,
  onWatermark,
  onMetadata,
  onEncrypt,
  onCheckUpdates,
  isCompressing,
  isEditMode,
  onShowInstall,
  onCloseDocument,
  onSave
}: TopBarProps) {
  const [activeMenu, setActiveMenu] = useState<'file' | 'tools' | 'help' | null>(null);
  const [isDark, setIsDark] = useState(isDarkMode());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleThemeChange = () => setIsDark(isDarkMode());
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'file' | 'tools' | 'help') => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleAction = (action: () => void) => {
    setActiveMenu(null);
    action();
  };

  return (
    <div 
      className="h-8 bg-lumvale-surface/70 backdrop-blur-md border-b border-lumvale-border flex items-center px-2 select-none relative z-50 text-sm" 
      ref={menuRef}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex space-x-1 h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="relative h-full flex items-center">
          <button 
            className={`px-3 h-full flex items-center transition-colors ${activeMenu === 'file' ? 'bg-lumvale-border text-white' : 'text-lumvale-muted hover:bg-lumvale-border hover:text-white'}`}
            onClick={() => toggleMenu('file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0 w-48 bg-lumvale-surface border border-lumvale-border shadow-2xl rounded-b-md py-1">
              <button onClick={() => handleAction(onExtract)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                Extract Pages...
              </button>
              <button onClick={() => handleAction(onSplit)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                Split Document...
              </button>
              {isEditMode && (
                <button onClick={() => handleAction(onMerge)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                  Merge Document...
                </button>
              )}
              <div className="h-px bg-lumvale-border my-1"></div>
              {onSave && (
                <button onClick={() => handleAction(onSave)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                  Save Document...
                </button>
              )}
              <button onClick={() => handleAction(onExport)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                Export PDF
              </button>
              {onCloseDocument && (
                <>
                  <div className="h-px bg-lumvale-border my-1"></div>
                  <button onClick={() => handleAction(onCloseDocument)} className="w-full text-left px-4 py-1.5 text-red-500 hover:bg-red-500 hover:text-white">
                    Close Document
                  </button>
                </>
              )}
              {typeof window !== 'undefined' && (window as any).electronAPI?.quitApp && (
                <button onClick={() => handleAction(() => (window as any).electronAPI.quitApp())} className="w-full text-left px-4 py-1.5 text-red-500 hover:bg-red-500 hover:text-white">
                  Exit App
                </button>
              )}
            </div>
          )}
        </div>

        <div className="relative h-full flex items-center">
          <button 
            className={`px-3 h-full flex items-center transition-colors ${activeMenu === 'tools' ? 'bg-lumvale-border text-white' : 'text-lumvale-muted hover:bg-lumvale-border hover:text-white'}`}
            onClick={() => toggleMenu('tools')}
          >
            Tools
          </button>
          {activeMenu === 'tools' && (
            <div className="absolute top-full left-0 mt-0 w-48 bg-lumvale-surface border border-lumvale-border shadow-2xl rounded-b-md py-1">
              {isEditMode ? (
                <>
                  <button 
                    onClick={() => handleAction(onCompress)} 
                    disabled={isCompressing}
                    className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCompressing ? 'Compressing...' : 'Compress / Optimize...'}
                  </button>
                  <button onClick={() => handleAction(onWatermark)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                    Add Watermark...
                  </button>
                  <div className="h-px bg-lumvale-border my-1"></div>
                  <button onClick={() => handleAction(onMetadata)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                    Edit Metadata...
                  </button>
                  <button onClick={() => handleAction(onEncrypt)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                    Encrypt / Lock...
                  </button>
                </>
              ) : (
                <div className="px-4 py-2 text-xs text-lumvale-muted italic">
                  Enable Edit Mode to unlock tools
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative h-full flex items-center">
          <button 
            className={`px-3 h-full flex items-center transition-colors ${activeMenu === 'help' ? 'bg-lumvale-border text-white' : 'text-lumvale-muted hover:bg-lumvale-border hover:text-white'}`}
            onClick={() => toggleMenu('help')}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute top-full left-0 mt-0 w-48 bg-lumvale-surface border border-lumvale-border shadow-2xl rounded-b-md py-1">
              <button onClick={() => handleAction(onCheckUpdates)} className="w-full text-left px-4 py-1.5 text-lumvale-text hover:bg-lumvale-primary hover:text-white">
                Check for Updates...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spacer keeps the menu (left) and controls (right) apart and leaves the
          centre of the bar as a draggable region in the Electron window. */}
      <div className="flex-1 h-full" />

      <div className="flex items-center space-x-2 h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {onShowInstall && (
          <button 
            onClick={onShowInstall}
            className="flex items-center px-3 py-1 bg-lumvale-primary/20 hover:bg-lumvale-primary/40 text-lumvale-primary border border-lumvale-primary/30 rounded-md text-xs font-semibold mr-2 transition-colors"
          >
            Install App
          </button>
        )}

        <button 
          onClick={toggleTheme}
          className="px-2 h-full flex items-center justify-center text-lumvale-muted hover:bg-lumvale-border hover:text-lumvale-text transition-colors mr-2"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

      </div>
    </div>
  );
}
