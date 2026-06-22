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

  // pdf.js takes ownership of (and may detach) the buffer it is given, so hand
  // it a private copy rather than the caller's array. The previous document is
  // intentionally not destroyed — in-flight page renders may still be reading
  // from it, and destroy() can hang the worker.
  const dataCopy = documentBytes.slice();
  cachedPromise = pdfjsLib.getDocument({ data: dataCopy }).promise;
  return cachedPromise;
};
