import React, { useState } from 'react';
import Workspace, { type WorkspaceProps } from './Workspace';
import { processFiles, type ProcessedFile } from '../utils/fileProcessor';
import { X, FileText, Plus } from 'lucide-react';

export interface TabbedWorkspaceProps extends Omit<WorkspaceProps, 'documentBytes' | 'pageCount' | 'onFilesSelected' | 'customTabBar'> {
}

export default function TabbedWorkspace(props: TabbedWorkspaceProps) {
  const [pdfs, setPdfs] = useState<ProcessedFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleFilesSelected = async (files: FileList | File[]) => {
    try {
      const processed = await processFiles(files);
      if (processed.length > 0) {
        setPdfs(prev => [...prev, ...processed]);
        // Switch to the first newly added document
        setActiveIndex(pdfs.length);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process files.');
    }
  };

  const handleCloseTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPdfs(prev => prev.filter((_, i) => i !== index));
    if (activeIndex >= index && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const tabBar = pdfs.length > 0 ? (
    <div className="flex items-center bg-[var(--color-lumvale-surface)] border-b border-[var(--color-lumvale-border)] h-10 px-2 overflow-x-auto custom-scrollbar no-scrollbar flex-shrink-0">
      {pdfs.map((pdf, idx) => (
        <div 
          key={`tab-${idx}`}
          onClick={() => setActiveIndex(idx)}
          className={`flex items-center space-x-2 px-4 h-full border-r border-[var(--color-lumvale-border)] cursor-pointer transition-colors min-w-[120px] max-w-[240px] ${
            activeIndex === idx 
              ? 'bg-[var(--color-lumvale-bg)] text-[var(--color-lumvale-primary)] font-medium border-t-2 border-t-vault-primary' 
              : 'bg-transparent text-[var(--color-lumvale-muted)] hover:bg-[var(--color-lumvale-border)]'
          }`}
        >
          <FileText size={14} className={activeIndex === idx ? 'text-[var(--color-lumvale-primary)] flex-shrink-0' : 'text-[var(--color-lumvale-muted)] flex-shrink-0'} />
          <span className="text-xs truncate flex-1">{pdf.name}</span>
          <button 
            onClick={(e) => handleCloseTab(idx, e)}
            className="p-0.5 rounded-md hover:bg-[var(--color-lumvale-border)] text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <label className="ml-2 p-1.5 rounded-lg hover:bg-[var(--color-lumvale-border)] cursor-pointer text-[var(--color-lumvale-muted)] hover:text-[var(--color-lumvale-text)] transition-colors flex-shrink-0">
        <input 
          type="file" 
          multiple
          className="hidden" 
          accept=".pdf,.docx,.xlsx,.pptx,.md,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/markdown" 
          onChange={(e) => {
            if (e.target.files) handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <Plus size={16} />
      </label>
    </div>
  ) : null;

  if (pdfs.length === 0) {
    return (
      <Workspace 
        {...props}
        documentBytes={null}
        pageCount={0}
        onFilesSelected={handleFilesSelected}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-[var(--color-lumvale-bg)]">
      {pdfs.map((pdf, idx) => (
        <div 
          key={`workspace-${idx}`} 
          className="absolute inset-0"
          style={{ 
            display: activeIndex === idx ? 'block' : 'none',
            zIndex: activeIndex === idx ? 10 : 0
          }}
        >
          <Workspace 
            {...props}
            documentBytes={pdf.bytes}
            documentName={pdf.name}
            pageCount={pdf.pageCount}
            onFilesSelected={handleFilesSelected}
            customTabBar={tabBar}
          />
        </div>
      ))}
    </div>
  );
}
