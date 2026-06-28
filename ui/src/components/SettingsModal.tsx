import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Key, Save, CheckCircle2 } from 'lucide-react';
import { set, get } from 'idb-keyval';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [openAIKey, setOpenAIKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      get('lumvalepdf-openai-key').then(key => {
        if (key) setOpenAIKey(key);
      });
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    await set('lumvalepdf-openai-key', openAIKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-lumvale-surface rounded-2xl shadow-2xl border border-lumvale-border w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-lumvale-border">
                <div className="flex items-center space-x-3 text-lumvale-text">
                  <Settings className="w-6 h-6 text-lumvale-primary" />
                  <h2 className="text-xl font-bold">Settings</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-lumvale-muted hover:text-lumvale-text transition-colors rounded-full p-1 hover:bg-lumvale-bg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center mb-4">
                    <Key className="w-5 h-5 mr-2 text-lumvale-accent" />
                    OpenAI API Key
                  </h3>
                  <p className="text-sm text-lumvale-muted mb-4">
                    To use premium AI Document Summarization via GPT-4, enter your OpenAI API key. 
                    This key is stored securely in your local browser storage and is never sent anywhere except directly to OpenAI. 
                    If left blank, LumvalePDF will use a local, offline AI model for summaries.
                  </p>
                  
                  <div className="relative">
                    <input
                      type="password"
                      value={openAIKey}
                      onChange={(e) => setOpenAIKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-lumvale-bg border border-lumvale-border rounded-xl py-3 px-4 text-lumvale-text focus:outline-none focus:ring-2 focus:ring-lumvale-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-lumvale-border bg-lumvale-bg/50 flex justify-end">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 bg-lumvale-primary hover:bg-lumvale-primary/90 text-[var(--color-lumvale-bg)] px-6 py-2.5 rounded-xl font-medium transition-all"
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
