import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initializeTheme, toggleTheme, isDarkMode } from './theme';

describe('theme utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    (window as any).electronAPI = {
      setTheme: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes to light theme if no preference and matchMedia is false', () => {
    initializeTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('initializes to dark theme if localStorage has dark', () => {
    localStorage.setItem('theme', 'dark');
    initializeTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect((window as any).electronAPI.setTheme).toHaveBeenCalledWith('dark');
  });

  it('toggles theme correctly', () => {
    initializeTheme(); // Starts light
    const isDark = toggleTheme();
    expect(isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect((window as any).electronAPI.setTheme).toHaveBeenCalledWith('dark');
    
    const isDarkAgain = toggleTheme();
    expect(isDarkAgain).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('isDarkMode returns current state', () => {
    expect(isDarkMode()).toBe(false);
    toggleTheme();
    expect(isDarkMode()).toBe(true);
  });
});
