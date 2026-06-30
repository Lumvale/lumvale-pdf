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
  onBates?: () => void;
  onHeadersFooters?: () => void;
  onMetadata: () => void;
  onEncrypt: () => void;
  onCheckUpdates: () => void;
  onOpen?: () => void;
  onAbout?: () => void;
  isCompressing: boolean;
  isEditMode: boolean;
  /** Small-screen "limited edit": hide the Tools menu (heavy editing ops). */
  compact?: boolean;
  onShowInstall?: () => void;
  onCloseDocument?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  customFileMenuItems?: React.ReactNode;
  customToolsMenuItems?: React.ReactNode;
  /**
   * Additional top-level menus the host app can add to the menu bar, rendered
   * after File (before Tools). Each becomes its own dropdown so apps can spread
   * their features across categorised menus instead of overloading Tools.
   */
  customMenus?: { id: string; label: string; items: React.ReactNode }[];
  /** Hide the built-in Tools menu (e.g. when the host folds the native page ops
   *  into its own menus via customMenus + nativeTools). */
  hideToolsMenu?: boolean;
  customTopBarRight?: React.ReactNode;
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
  onBates,
  onHeadersFooters,
  onMetadata,
  onEncrypt,
  onCheckUpdates,
  onOpen,
  onAbout,
  isCompressing,
  isEditMode,
  compact = false,
  onShowInstall,
  onCloseDocument,
  onSave,
  onSaveAs,
  customFileMenuItems,
  customToolsMenuItems,
  customMenus,
  hideToolsMenu,
  customTopBarRight
}: TopBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
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

  const toggleMenu = (menu: string) => {
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
            className={`px-3 h-full flex items-center transition-colors ${activeMenu === 'file' ? 'bg-lumvale-border text-[var(--color-lumvale-text)]' : 'text-lumvale-muted hover:bg-lumvale-border hover:text-[var(--color-lumvale-text)]'}`}
            onClick={() => toggleMenu('file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0 w-48 bg-[var(--color-lumvale-surface)] border border-[var(--color-lumvale-border)] shadow-2xl rounded-b-md py-1">
              {onOpen && (
                <button onClick={() => handleAction(onOpen)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                  Open Document...
                </button>
              )}
              {isEditMode && (
                <button onClick={() => handleAction(onMerge)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                  Merge Document...
                </button>
              )}
              <div className="h-px bg-[var(--color-lumvale-border)] my-1"></div>
              {onSave && (
                <button onClick={() => handleAction(onSave)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                  Save Document...
                </button>
              )}
              {onSaveAs && (
                <button onClick={() => handleAction(onSaveAs)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                  Save As...
                </button>
              )}
              <button onClick={() => handleAction(onExport)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                Export to Image...
              </button>
              {onCloseDocument && (
                <>
                  <div className="h-px bg-[var(--color-lumvale-border)] my-1"></div>
                  <button onClick={() => handleAction(onCloseDocument)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                    Close Document
                  </button>
                </>
              )}
              {customFileMenuItems}
              {typeof window !== 'undefined' && (window as any).electronAPI?.quitApp && (
                <button onClick={() => handleAction(() => (window as any).electronAPI.quitApp())} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                  Exit App
                </button>
              )}
            </div>
          )}
        </div>

        {/* Host-app menus (e.g. Create / Edit / AI / Secure / View) — one
            dropdown each. Clicking any item closes the menu (bubbled onClick). */}
        {(customMenus ?? []).map((m) => (
          <div key={m.id} className={`relative h-full flex items-center ${compact ? 'hidden' : ''}`}>
            <button
              className={`px-3 h-full flex items-center transition-colors ${activeMenu === m.id ? 'bg-[var(--color-lumvale-border)] text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
              onClick={() => toggleMenu(m.id)}
            >
              {m.label}
            </button>
            {!compact && activeMenu === m.id && (
              <div
                className="absolute top-full left-0 mt-0 w-56 bg-[var(--color-lumvale-surface)] border border-[var(--color-lumvale-border)] shadow-2xl rounded-b-md py-1"
                onClick={() => setActiveMenu(null)}
              >
                {m.items}
              </div>
            )}
          </div>
        ))}

        {/* When the host folds the native page ops into its own menus it sets
            hideToolsMenu, so we drop the Tools menu entirely (not just CSS-hide
            it) — it shouldn't linger in the DOM or tab order. `compact` still
            uses CSS hiding for the responsive small-screen case. */}
        {!hideToolsMenu && (
        <div className={`relative h-full flex items-center ${compact ? 'hidden' : ''}`}>
          <button
            className={`px-3 h-full flex items-center transition-colors ${activeMenu === 'tools' ? 'bg-[var(--color-lumvale-border)] text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
            onClick={() => toggleMenu('tools')}
          >
            Tools
          </button>
          {!compact && activeMenu === 'tools' && (
            <div className="absolute top-full left-0 mt-0 w-48 bg-[var(--color-lumvale-surface)] border border-[var(--color-lumvale-border)] shadow-2xl rounded-b-md py-1">
              {/* Page-level operations — available regardless of edit mode. */}
              <button onClick={() => handleAction(onExtract)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                Extract Pages...
              </button>
              <button onClick={() => handleAction(onSplit)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                Split Document...
              </button>
              <div className="h-px bg-[var(--color-lumvale-border)] my-1"></div>
              {isEditMode ? (
                <>
                  <button 
                    onClick={() => handleAction(onCompress)} 
                    disabled={isCompressing}
                    className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCompressing ? 'Compressing...' : 'Compress / Optimize...'}
                  </button>
                  <button onClick={() => handleAction(onWatermark)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                    Add Watermark...
                  </button>
                  {onBates && (
                    <button onClick={() => handleAction(onBates)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                      Page Numbering...
                    </button>
                  )}
                  {onHeadersFooters && (
                    <button onClick={() => handleAction(onHeadersFooters)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                      Headers &amp; Footers...
                    </button>
                  )}
                  <div className="h-px bg-[var(--color-lumvale-border)] my-1"></div>
                  <button onClick={() => handleAction(onMetadata)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                    Edit Metadata...
                  </button>
                  <button onClick={() => handleAction(onEncrypt)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                    Encrypt / Lock...
                  </button>
                </>
              ) : (
                <div className="px-4 py-2 text-xs text-[var(--color-lumvale-muted)] italic">
                  Enable Edit Mode to unlock tools
                </div>
              )}
              {customToolsMenuItems}
            </div>
          )}
        </div>
        )}

        <div className="relative h-full flex items-center">
          <button
            className={`px-3 h-full flex items-center transition-colors ${activeMenu === 'help' ? 'bg-[var(--color-lumvale-border)] text-[var(--color-lumvale-text)]' : 'text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)] hover:text-[var(--color-lumvale-text)]'}`}
            onClick={() => toggleMenu('help')}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute top-full left-0 mt-0 w-48 bg-[var(--color-lumvale-surface)] border border-[var(--color-lumvale-border)] shadow-2xl rounded-b-md py-1">
              <button onClick={() => handleAction(onCheckUpdates)} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                Check for Updates...
              </button>
              <button onClick={() => handleAction(() => onAbout?.())} className="w-full text-left px-4 py-1.5 text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-primary)] hover:text-[var(--color-lumvale-bg)]">
                About Lumvale
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
        
        {customTopBarRight}

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
