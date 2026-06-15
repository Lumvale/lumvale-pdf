import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, Trash2 } from 'lucide-react';
import { getRecentFiles, removeRecentFile } from '../utils/recentFiles';
import type { RecentFile } from '../utils/recentFiles';

interface RecentFilesProps {
  onSelect: (file: RecentFile) => void;
}

export default function RecentFiles({ onSelect }: RecentFilesProps) {
  const [files, setFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const rf = await getRecentFiles();
    setFiles(rf);
  };

  const handleRemove = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    await removeRecentFile(name);
    await loadFiles();
  };

  if (files.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 px-4">
      <div className="flex items-center gap-2 mb-4 text-lumvale-muted">
        <Clock className="w-5 h-5" />
        <h2 className="text-sm font-bold uppercase tracking-wider">Recent Files</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map((f, idx) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            onClick={() => onSelect(f)}
            className="group relative bg-lumvale-surface border border-lumvale-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-lumvale-accent transition-all hover:shadow-lg"
          >
            <div className="w-10 h-10 rounded bg-lumvale-primary/20 text-lumvale-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lumvale-text truncate" title={f.name}>{f.name}</h3>
              <p className="text-xs text-lumvale-muted mt-1">
                {f.pageCount} {f.pageCount === 1 ? 'page' : 'pages'} • Opened {new Date(f.timestamp).toLocaleDateString()}
              </p>
            </div>
            
            <button
              onClick={(e) => handleRemove(e, f.name)}
              className="p-2 text-lumvale-muted hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
              title="Remove from history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
