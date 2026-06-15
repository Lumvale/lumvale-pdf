export function initializeTheme() {
  const storedTheme = localStorage.getItem('theme');
  const isDark = storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  if (typeof window !== 'undefined' && (window as any).electronAPI?.setTheme) {
    (window as any).electronAPI.setTheme(isDark ? 'dark' : 'light');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('themechange'));
  if (typeof window !== 'undefined' && (window as any).electronAPI?.setTheme) {
    (window as any).electronAPI.setTheme(isDark ? 'dark' : 'light');
  }
  return isDark;
}

export function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}