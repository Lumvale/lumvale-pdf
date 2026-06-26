import type { DocumentEngine } from './port';
import { createPdfCoreEngine } from './pdfCoreEngine';

/**
 * OSS engine wiring for @lumvale/pdf-ui.
 *
 * Unlike the commercial workspace — which injects a DocumentEngine through a
 * React context so a host can swap in a cloud/off-thread engine — the OSS editor
 * never varies its engine: it always runs the local @lumvale/pdf-core adapter.
 * So we expose a single shared instance and a trivial `useDocumentEngine()` hook
 * that returns it. The hook keeps component code identical in shape to the
 * commercial workspace (which uses a context hook of the same name), so the two
 * editors stay easy to diff and sync.
 */
export const documentEngine: DocumentEngine = createPdfCoreEngine();

/** Returns the OSS document engine (the local pdf-core adapter). */
export function useDocumentEngine(): DocumentEngine {
  return documentEngine;
}

export { createPdfCoreEngine } from './pdfCoreEngine';
export type {
  DocumentEngine,
  DocumentMetadata,
  WatermarkOptions,
  BatesOptions,
  HeaderFooterOptions,
  EncryptOptions,
  PageSource,
} from './port';
