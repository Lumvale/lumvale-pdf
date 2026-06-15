import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UpdateToast() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-4 bg-lumvale-panel border border-lumvale-primary shadow-xl rounded-lg px-4 py-3"
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Update Available</span>
            <span className="text-xs text-gray-400">A new version of LumvalePDF is ready.</span>
          </div>
          
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-lumvale-primary hover:bg-lumvale-primary/90 text-white text-sm px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          
          <button 
            onClick={() => setUpdateAvailable(false)}
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
