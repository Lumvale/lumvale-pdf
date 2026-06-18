import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { LumvalePDFEngine } from '@lumvale/pdf-core';
import { convertWordToPDF, convertExcelToPDF, convertMarkdownToPDF, convertImageToPDF, convertPPTXToPDF, mergePDFs } from '@lumvale/pdf-browser';
import { Loader2 } from 'lucide-react';

interface PDFUploaderProps {
  onLoaded: (name: string, bytes: Uint8Array, pageCount: number) => void;
}

export default function PDFUploader({ onLoaded }: PDFUploaderProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setIsConverting(true);
    try {
      const pdfBytesArray: Uint8Array[] = [];
      const fileList = Array.from(files);
      
      for (const file of fileList) {
        let buffer = await file.arrayBuffer();
        let bytes = new Uint8Array(buffer);

        if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          bytes = (await convertWordToPDF(bytes)) as any;
        } else if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          bytes = (await convertExcelToPDF(bytes)) as any;
        } else if (file.name.endsWith('.md') || file.type === 'text/markdown') {
          bytes = (await convertMarkdownToPDF(bytes)) as any;
        } else if (file.name.endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
          bytes = (await convertPPTXToPDF(bytes)) as any;
        } else if (file.type.startsWith('image/')) {
          bytes = (await convertImageToPDF(bytes, file.type)) as any;
        }
        
        pdfBytesArray.push(bytes);
      }

      let finalBytes: Uint8Array;
      if (pdfBytesArray.length > 1) {
        finalBytes = await mergePDFs(pdfBytesArray);
      } else {
        finalBytes = pdfBytesArray[0];
      }

      const engine = new LumvalePDFEngine();
      const doc = await engine.loadDocument(finalBytes);
      
      const count = doc.getPageCount();
      setPageCount(count);
      console.log('Successfully loaded document with page count:', count);
      
      const outName = fileList.length > 1 ? 'Merged_Document.pdf' : fileList[0].name;
      onLoaded(outName, finalBytes, count);
    } catch (err: any) {
      console.error('Failed to parse document:', err);
      setErrorMsg(err.message || 'Failed to parse document. Please ensure all files are valid formats.');
    } finally {
      setIsConverting(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validTypes = [
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/markdown'
      ];
      const allValid = files.every(file => 
        validTypes.includes(file.type) || 
        file.name.endsWith('.docx') || 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.pptx') || 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.md') ||
        file.type.startsWith('image/')
      );
      
      if (allValid) {
        processFiles(files);
      } else {
        setErrorMsg('Please drop valid supported files only.');
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      <motion.div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
          isHovering ? 'border-lumvale-accent bg-lumvale-surface' : 'border-lumvale-border bg-lumvale-bg bg-opacity-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
        onDragLeave={() => setIsHovering(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <UploadCloud className="w-16 h-16 text-lumvale-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Drag & Drop your files here</h3>
        <p className="text-lumvale-muted mb-2">
          Supports PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), Markdown (.md), and Images
        </p>
        <p className="text-sm font-semibold text-lumvale-primary underline cursor-pointer">
          or browse files
        </p>
        <input 
          id="file-upload"
          type="file" 
          multiple
          accept=".pdf,.docx,.xlsx,.pptx,.md,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/markdown" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
            }
          }} 
        />
        
        {isConverting && (
          <div className="mt-6 p-4 flex flex-col items-center justify-center text-lumvale-primary">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="font-bold">Converting document...</p>
          </div>
        )}
        
        {pageCount !== null && !isConverting && !errorMsg && (
          <div className="mt-6 p-4 bg-green-900 bg-opacity-30 rounded-xl border border-green-500 text-green-300">
            <p className="font-bold">Success!</p>
            <p>Loaded document with {pageCount} pages using LumvalePDF engine.</p>
          </div>
        )}

        {errorMsg && !isConverting && (
          <div className="mt-6 p-4 bg-red-900 bg-opacity-30 rounded-xl border border-red-500 text-red-300">
            <p className="font-bold">Error Processing Document</p>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
