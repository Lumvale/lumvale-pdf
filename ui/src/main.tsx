import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'pdfjs-dist/web/pdf_viewer.css'
import App from './App.tsx'
import { initializeTheme } from './utils/theme'

initializeTheme();

// Polyfill for Uint8Array.prototype.toHex which is missing in some environments
// and causes "hashOriginal.toHex is not a function" in pdfjs-dist.
if (!(Uint8Array.prototype as any).toHex) {
  (Uint8Array.prototype as any).toHex = function () {
    return Array.from(this as Uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
  };
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        // We'll dispatch a custom event that a UI component can listen to
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });
  }).catch(console.error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
