import { X, Shield, Star, Heart } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end p-2">
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-lumvale-border)] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col items-center text-center -mt-2">
          <img src="/Lumvale-pdf-light.svg" alt="LumvalePDF" className="dark:hidden h-12 mb-3" />
          <img src="/Lumvale-pdf-dark.svg" alt="LumvalePDF" className="hidden dark:block h-12 mb-3" />

          {VERSION && (
            <span className="text-xs font-mono text-lumvale-muted bg-lumvale-bg border border-lumvale-border rounded-full px-3 py-0.5 mb-4">
              v{VERSION}
            </span>
          )}

          <p className="text-sm text-lumvale-muted leading-relaxed mb-4">
            A free, high-quality, and fast open-source PDF toolkit. Every operation runs entirely
            on your device — your files never leave your computer.
          </p>

          <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-5">
            <Shield className="w-4 h-4 flex-shrink-0" />
            100% offline &amp; private — no uploads, no tracking.
          </div>

          <div className="flex flex-col gap-2 w-full">
            <a
              href="https://github.com/Lumvale/lumvale-pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded text-sm font-semibold border border-lumvale-border text-lumvale-text hover:border-lumvale-primary hover:text-lumvale-primary transition-colors"
            >
              <Star className="w-4 h-4" />
              View on GitHub
            </a>
            <a
              href="https://github.com/sponsors/Lumvale"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded text-sm font-semibold bg-lumvale-primary/15 text-lumvale-primary border border-lumvale-primary/30 hover:bg-lumvale-primary/25 transition-colors"
            >
              <Heart className="w-4 h-4" />
              Sponsor the project
            </a>
          </div>

          <p className="text-[10px] text-lumvale-muted mt-5">
            © {new Date().getFullYear()} Lumvale · Apache-2.0 License
          </p>
        </div>
      </div>
    </div>
  );
}
