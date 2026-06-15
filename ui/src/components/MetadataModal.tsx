import { useState } from 'react';
import type { PDFMetadata } from '@lumvalepdf/core';

interface MetadataModalProps {
  initialMetadata: PDFMetadata;
  onSave: (metadata: Partial<PDFMetadata>) => void;
  onClose: () => void;
}

export default function MetadataModal({ initialMetadata, onSave, onClose }: MetadataModalProps) {
  const [formData, setFormData] = useState<Partial<PDFMetadata>>({
    title: initialMetadata.title || '',
    author: initialMetadata.author || '',
    subject: initialMetadata.subject || '',
    keywords: initialMetadata.keywords || '',
    creator: initialMetadata.creator || '',
    producer: initialMetadata.producer || '',
  });

  const [confirmClear, setConfirmClear] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    
    // Clear all strings
    setFormData({
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
    });
    setConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-lumvale-border flex justify-between items-center bg-[#0d1117]">
          <h2 className="text-xl font-bold text-lumvale-accent">Metadata Manager</h2>
          <button onClick={onClose} className="text-lumvale-muted hover:text-white transition-colors">&times;</button>
        </div>
        
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {['title', 'author', 'subject', 'keywords', 'creator', 'producer'].map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-lumvale-muted uppercase tracking-wider">
                {field}
              </label>
              <input
                type="text"
                name={field}
                value={(formData as any)[field] || ''}
                onChange={handleChange}
                data-testid={`meta-${field}`}
                className="w-full bg-black/30 border border-lumvale-border rounded p-2 text-white focus:border-lumvale-primary focus:outline-none transition-colors"
                placeholder={`Enter ${field}...`}
              />
            </div>
          ))}

          {/* Creation & Modification Date Read-only Display */}
          <div className="pt-4 mt-4 border-t border-lumvale-border text-xs text-lumvale-muted grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold text-gray-400">Created: </span>
              {initialMetadata.creationDate ? initialMetadata.creationDate.toLocaleDateString() : 'Unknown'}
            </div>
            <div>
              <span className="font-semibold text-gray-400">Modified: </span>
              {initialMetadata.modificationDate ? initialMetadata.modificationDate.toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-lumvale-border bg-[#0d1117] flex justify-between items-center">
          <button 
            onClick={handleClearAll}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              confirmClear 
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                : 'bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/30'
            }`}
          >
            {confirmClear ? 'Click again to confirm' : 'Clear All Metadata'}
          </button>
          
          <div className="space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-lumvale-muted hover:text-white transition-colors">
              Cancel
            </button>
            <button 
              onClick={() => onSave(formData)}
              className="px-6 py-2 text-sm bg-lumvale-primary text-white rounded font-bold hover:opacity-90 transition-opacity"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
