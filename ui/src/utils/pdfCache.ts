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

/**
 * Loads a fresh, standalone document that is NOT shared with the viewer cache.
 * Use this for batch work (e.g. image export) that calls page.cleanup() or
 * destroys the document — doing that on the shared instance would corrupt the
 * live viewer's pages. Call the returned `destroy()` when finished. Destruction
 * goes through the loading task, which is where pdf.js exposes it.
 */
export const loadIsolatedPDFDocument = async (
  documentBytes: Uint8Array,
): Promise<{ pdf: pdfjsLib.PDFDocumentProxy; destroy: () => void }> => {
  const task = pdfjsLib.getDocument({ data: documentBytes.slice() });
  const pdf = await task.promise;
  return { pdf, destroy: () => { void task.destroy(); } };
};
