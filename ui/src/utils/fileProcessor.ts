import { LumvalePDFEngine } from '@lumvale/pdf-core';
import { convertWordToPDF, convertExcelToPDF, convertMarkdownToPDF, convertImageToPDF, convertPPTXToPDF, mergePDFs } from '@lumvale/pdf-browser';

export interface ProcessedFile {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

export async function processFiles(files: FileList | File[], merge: boolean = false): Promise<ProcessedFile[]> {
  const fileList = Array.from(files);
  const pdfBytesArray: Uint8Array[] = [];
  
  // Convert all supported formats to PDF bytes
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

  // If merge is requested and multiple files exist, merge them
  if (merge && pdfBytesArray.length > 1) {
    const finalBytes = await mergePDFs(pdfBytesArray);
    const engine = new LumvalePDFEngine();
    const doc = await engine.loadDocument(finalBytes);
    const count = doc.getPageCount();
    
    return [{
      name: 'Merged_Document.pdf',
      bytes: finalBytes,
      pageCount: count
    }];
  }

  // Otherwise, return them separately
  const results: ProcessedFile[] = [];
  for (let i = 0; i < pdfBytesArray.length; i++) {
    const engine = new LumvalePDFEngine();
    const doc = await engine.loadDocument(pdfBytesArray[i]);
    results.push({
      name: fileList[i].name,
      bytes: pdfBytesArray[i],
      pageCount: doc.getPageCount()
    });
  }
  
  return results;
}
