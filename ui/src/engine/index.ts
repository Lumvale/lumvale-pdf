import type { DocumentEngine } from './port';
import { createWorkerPdfEngine } from './workerEngine';

/**
 * Engine wiring for @lumvale/pdf-ui.
 *
 * The editor always runs the local @lumvale/pdf-core, so we expose a single
 * shared instance and a trivial `useDocumentEngine()` hook that returns it. The
 * hook keeps the call sites uniform, so swapping the engine implementation later
 * (or injecting one) stays a one-line change.
 *
 * The default engine offloads heavy ops to an inlined Blob worker (see
 * workerEngine.ts) so large PDFs don't freeze the UI; it transparently falls
 * back to the main thread where Worker isn't available (SSR). Use
 * `createPdfCoreEngine()` directly for a pure main-thread engine.
 */
export const documentEngine: DocumentEngine = createWorkerPdfEngine();

/** Returns the OSS document engine (worker-backed, with a main-thread fallback). */
export function useDocumentEngine(): DocumentEngine {
  return documentEngine;
}

export { createPdfCoreEngine } from './pdfCoreEngine';
export { createWorkerPdfEngine } from './workerEngine';
export type {
  DocumentEngine,
  DocumentMetadata,
  WatermarkOptions,
  BatesOptions,
  HeaderFooterOptions,
  EncryptOptions,
  PdfPermissions,
  PageSource,
} from './port';
