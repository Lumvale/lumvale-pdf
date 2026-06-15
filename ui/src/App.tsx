import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wand2, Zap, Shield, Moon, Sun } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import Workspace from './components/Workspace';
import RecentFiles from './components/RecentFiles';
import { addRecentFile } from './utils/recentFiles';
import { toggleTheme, isDarkMode } from './utils/theme';
import './index.css';

function App() {
  const [pdfData, setPdfData] = useState<{ name?: string, bytes: Uint8Array; pageCount: number } | null>(null);
  const [isDark, setIsDark] = useState(isDarkMode());

  useEffect(() => {
    const handleThemeChange = () => setIsDark(isDarkMode());
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  const handlePdfLoaded = async (name: string, bytes: Uint8Array, pageCount: number) => {
    // Set UI state immediately so we don't block on IndexedDB
    setPdfData({ name, bytes, pageCount });
    
    // Save to IndexedDB recent files asynchronously in the background
    try {
      const fileId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      await addRecentFile({
        id: fileId,
        name,
        bytes,
        pageCount,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to save recent file', err);
    }
  };

  if (pdfData) {
    return <Workspace documentBytes={pdfData.bytes} pageCount={pdfData.pageCount} onCloseDocument={() => setPdfData(null)} />;
  }
  return (
    <div className="min-h-screen bg-lumvale-bg text-lumvale-text relative overflow-x-hidden flex flex-col items-center pt-12 pb-8 px-4">
      {/* Theme Toggle */}
      <div className="absolute bottom-8 right-8 z-50">
        <button 
          onClick={() => {
            toggleTheme();
            setIsDark(!isDark);
          }}
          className="p-3 rounded-full bg-lumvale-surface/50 hover:bg-lumvale-surface backdrop-blur-md border border-lumvale-border shadow-lg text-lumvale-muted hover:text-lumvale-text transition-all"
        >
          {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
        </button>
      </div>

      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#F1C45E] rounded-full filter blur-[100px] opacity-20 dark:opacity-40 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#4FB89A] rounded-full filter blur-[100px] opacity-20 dark:opacity-40 animate-pulse delay-1000 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center max-w-4xl w-full flex flex-col items-center"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mb-8 flex items-center justify-center"
        >
          <img src="/Lumvale-pdf-light.svg" alt="LumvalePDF Logo" className="dark:hidden h-16" />
          <img src="/Lumvale-pdf-dark.svg" alt="LumvalePDF Logo" className="hidden dark:block h-16" />
        </motion.div>
        
        <p className="text-lg text-lumvale-muted mb-8 max-w-xl mx-auto leading-relaxed">
          Your private, ultra-fast PDF studio. Everything happens instantly on your device—no uploads, no waiting, total security.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8 w-full">
          {[
            { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: "Ultra Fast", desc: "Instant loads, zero lag." },
            { icon: <Shield className="w-5 h-5 text-green-400" />, title: "100% Private", desc: "Your files never leave your device." },
            { icon: <FileText className="w-5 h-5 text-purple-400" />, title: "Core PDF Tools", desc: "Merge, Split, Extract, Edit." }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + (idx * 0.1) }}
              className="bg-lumvale-surface border border-lumvale-border backdrop-blur-lg rounded-xl p-4 text-left hover:border-lumvale-accent transition-colors flex items-center gap-4"
            >
              <div className="bg-lumvale-bg bg-opacity-50 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-base font-bold mb-0.5">{feature.title}</h3>
                <p className="text-lumvale-muted text-xs leading-tight">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative z-20 w-full max-w-2xl"
        >
          <PDFUploader onLoaded={handlePdfLoaded} />
        </motion.div>
        
        <RecentFiles onSelect={(file) => setPdfData({ name: file.name, bytes: file.bytes, pageCount: file.pageCount })} />
      </motion.div>
    </div>
  );
}

export default App;
