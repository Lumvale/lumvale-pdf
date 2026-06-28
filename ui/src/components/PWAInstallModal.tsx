import { Download, X, CheckCircle2, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOSManualInstall: boolean;
}

export default function PWAInstallModal({ isOpen, onClose, onInstall, isIOSManualInstall }: PWAInstallModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="relative h-32 bg-gradient-to-br from-lumvale-primary/40 to-lumvale-surface flex items-center justify-center p-6 border-b border-lumvale-border">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-lumvale-muted hover:text-[var(--color-lumvale-text)] bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="bg-lumvale-primary w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center rotate-3 border-2 border-[var(--color-lumvale-border)]">
                <Download size={32} className="text-[var(--color-lumvale-text)]" />
              </div>
            </div>

            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-[var(--color-lumvale-text)] mb-2">Install LumvalePDF</h2>
              <p className="text-sm text-lumvale-muted mb-6 px-4">
                Install LumvalePDF on your device to enjoy a faster, app-like experience that works completely offline.
              </p>

              <div className="flex flex-col gap-3 mb-8 text-left max-w-[280px] mx-auto">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 size={16} className="text-lumvale-primary shrink-0" />
                  <span>Works 100% Offline</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 size={16} className="text-lumvale-primary shrink-0" />
                  <span>No Ads, No Tracking</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 size={16} className="text-lumvale-primary shrink-0" />
                  <span>Native App Window</span>
                </div>
              </div>

              {isIOSManualInstall ? (
                <div className="bg-[var(--color-lumvale-border)] border border-[var(--color-lumvale-border)] rounded-lg p-4 text-left">
                  <h3 className="text-sm font-semibold text-[var(--color-lumvale-text)] flex items-center gap-2 mb-2">
                    <Share size={16} /> iOS Installation
                  </h3>
                  <p className="text-xs text-[var(--color-lumvale-muted)] mb-2">To install on your iPhone or iPad:</p>
                  <ol className="text-xs text-gray-300 list-decimal pl-4 space-y-1">
                    <li>Tap the <strong className="text-[var(--color-lumvale-text)]">Share</strong> button in Safari's bottom bar.</li>
                    <li>Scroll down and select <strong className="text-[var(--color-lumvale-text)]">Add to Home Screen</strong>.</li>
                    <li>Tap <strong className="text-[var(--color-lumvale-text)]">Add</strong> in the top right corner.</li>
                  </ol>
                </div>
              ) : (
                <button
                  onClick={onInstall}
                  className="w-full bg-lumvale-primary hover:bg-lumvale-primary/90 text-[var(--color-lumvale-bg)] font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Install App
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
