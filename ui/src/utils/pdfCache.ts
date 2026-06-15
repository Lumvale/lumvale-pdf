import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure the worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

let cachedBytes: Uint8Array | null = null;
let cachedPromise: Promise<pdfjsLib.PDFDocumentProxy> | null = null;

export const getPDFDocument = (documentBytes: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> => {
  if (cachedBytes === documentBytes && cachedPromise) {
    return cachedPromise;
  }
  cachedBytes = documentBytes;
  const dataCopy = documentBytes.slice();
  const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
  cachedPromise = loadingTask.promise;
  return cachedPromise;
};
