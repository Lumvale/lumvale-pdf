import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, FileSignature } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (asNative: boolean) => void;
}

export default function SaveModal({ isOpen, onClose, onConfirm }: SaveModalProps) {
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
            className="relative bg-lumvale-panel border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lumvale-primary to-blue-500"></div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-2">Save & Download PDF</h2>
            <p className="text-gray-400 text-sm mb-6">
              You have pending annotations. How would you like to save them to the final PDF?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => onConfirm(true)}
                className="w-full group relative flex items-start space-x-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-lumvale-primary/50 transition-all text-left"
              >
                <div className="p-2 rounded-lg bg-lumvale-primary/20 text-lumvale-primary group-hover:scale-110 transition-transform">
                  <FileSignature size={24} />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Native Annotations (Recommended)</h3>
                  <p className="text-xs text-gray-400">
                    Saves as standard editable PDF annotations. You can modify or remove them later in LumvalePDF or other standard editors.
                  </p>
                </div>
              </button>

              <button
                onClick={() => onConfirm(false)}
                className="w-full group relative flex items-start space-x-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-orange-500/50 transition-all text-left"
              >
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500 group-hover:scale-110 transition-transform">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Flatten Document</h3>
                  <p className="text-xs text-gray-400">
                    Permanently burns the annotations into the PDF pages. They will become part of the image and cannot be edited later.
                  </p>
                </div>
              </button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
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
