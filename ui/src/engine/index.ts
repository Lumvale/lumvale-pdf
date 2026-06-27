import type { DocumentEngine } from './port';
import { createWorkerPdfEngine } from './workerEngine';

/**
 * OSS engine wiring for @lumvale/pdf-ui.
 *
 * Unlike the commercial workspace — which injects a DocumentEngine through a
 * React context so a host can swap in a cloud engine — the OSS editor never
 * varies its engine: it always runs the local @lumvale/pdf-core. So we expose a
 * single shared instance and a trivial `useDocumentEngine()` hook that returns
 * it. The hook keeps component code identical in shape to the commercial
 * workspace (which uses a context hook of the same name), so the two editors
 * stay easy to diff and sync.
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
  PageSource,
} from './port';
