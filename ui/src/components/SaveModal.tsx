import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, FileSignature } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (asNative: boolean, filename?: string) => void;
  isSaveAs?: boolean;
  hasAnnotations?: boolean;
  originalFilename?: string;
}

export default function SaveModal({ isOpen, onClose, onConfirm, isSaveAs, hasAnnotations = true, originalFilename = 'document.pdf' }: SaveModalProps) {
  const [filename, setFilename] = useState('document_modified.pdf');

  // Reset filename when modal opens
  useEffect(() => {
    if (isOpen) {
      const nameParts = originalFilename.split('.');
      const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '.pdf';
      const base = nameParts.join('.');
      setFilename(`${base}_modified${ext}`);
    }
  }, [isOpen, originalFilename]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-lumvale-panel border border-[var(--color-lumvale-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lumvale-primary to-blue-500"></div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-[var(--color-lumvale-text)] mb-2">{isSaveAs ? 'Save Document As' : 'Save & Download PDF'}</h2>
            <p className="text-[var(--color-lumvale-muted)] text-sm mb-6">
              {hasAnnotations 
                ? 'You have pending annotations. How would you like to save them to the final PDF?'
                : 'Choose a file name to save the document.'}
            </p>

            {isSaveAs && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--color-lumvale-muted)] mb-1">File Name</label>
                <input 
                  type="text" 
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full bg-[var(--color-lumvale-border)] border border-[var(--color-lumvale-border)] rounded-lg px-4 py-2 text-[var(--color-lumvale-text)] focus:outline-none focus:border-lumvale-primary transition-colors"
                  placeholder="document_name.pdf"
                />
              </div>
            )}

            {hasAnnotations ? (
              <div className="space-y-3">
                <button
                  onClick={() => onConfirm(true, filename)}
                  className="w-full group relative flex items-start space-x-4 p-4 rounded-xl border border-white/5 bg-[var(--color-lumvale-border)] hover:bg-[var(--color-lumvale-border)] hover:border-lumvale-primary/50 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-lumvale-primary/20 text-lumvale-primary group-hover:scale-110 transition-transform">
                    <FileSignature size={24} />
                  </div>
                  <div>
                    <h3 className="text-[var(--color-lumvale-text)] font-medium mb-1">Native Annotations (Recommended)</h3>
                    <p className="text-xs text-[var(--color-lumvale-muted)]">
                      Saves as standard editable PDF annotations. You can modify or remove them later in LumvalePDF or other standard editors.
                    </p>
                  </div>
                </button>
  
                <button
                  onClick={() => onConfirm(false, filename)}
                  className="w-full group relative flex items-start space-x-4 p-4 rounded-xl border border-white/5 bg-[var(--color-lumvale-border)] hover:bg-[var(--color-lumvale-border)] hover:border-orange-500/50 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500 group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 className="text-[var(--color-lumvale-text)] font-medium mb-1">Flatten Document</h3>
                    <p className="text-xs text-[var(--color-lumvale-muted)]">
                      Permanently burns the annotations into the PDF pages. They will become part of the image and cannot be edited later.
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => onConfirm(true, filename)}
                  className="px-6 py-2 bg-lumvale-primary text-white font-medium rounded-lg hover:bg-lumvale-primary/90 transition-colors"
                >
                  Save Document
                </button>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[var(--color-lumvale-text)] hover:bg-[var(--color-lumvale-border)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
