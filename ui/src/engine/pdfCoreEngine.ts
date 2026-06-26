import { LumvalePDFEngine } from '@lumvale/pdf-core';
import type {
  DocumentEngine,
  DocumentMetadata,
  WatermarkOptions,
  BatesOptions,
  HeaderFooterOptions,
  EncryptOptions,
  PageSource,
} from './port';

/**
 * Default DocumentEngine adapter — wraps @lumvale/pdf-core (LumvalePDFEngine).
 *
 * The bridge between the engine-agnostic port and the concrete OSS engine. Each
 * op follows the engine's load → operate → export lifecycle and returns new
 * bytes, leaving the input untouched. Option objects flow through from the
 * workspace modals already shaped for the engine; the port's option types are
 * intentionally loose (index signatures), so we cast at this boundary — that's
 * the adapter's job.
 *
 * In OSS pdf-ui the engine never varies, so this is the single engine the
 * workspace uses (see ./index). The shape matches the commercial workspace's
 * adapter so a host could still substitute its own DocumentEngine if needed.
 */
export function createPdfCoreEngine(): DocumentEngine {
  return {
    async getPageCount(documentBytes) {
      const engine = new LumvalePDFEngine();
      const doc = await engine.loadDocument(documentBytes);
      return doc.getPageCount();
    },

    async getMetadata(documentBytes): Promise<DocumentMetadata> {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      return engine.getMetadata();
    },

    async setMetadata(documentBytes, metadata) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      engine.updateMetadata(metadata);
      return engine.exportBytes();
    },

    async addWatermark(documentBytes, options: WatermarkOptions) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      await engine.addWatermark(options as any);
      return engine.exportBytes();
    },

    async addBatesNumbering(documentBytes, options: BatesOptions) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      await engine.addBatesNumbering(options as any);
      return engine.exportBytes();
    },

    async addHeadersFooters(documentBytes, options: HeaderFooterOptions) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      await engine.addHeadersFooters(options as any);
      return engine.exportBytes();
    },

    async compress(documentBytes) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      await engine.compressDocument();
      return engine.exportBytes();
    },

    async encrypt(documentBytes, options: EncryptOptions) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      return engine.exportEncryptedBytes(options.userPassword, options.ownerPassword);
    },

    async rotatePage(documentBytes, pageIndex, degrees) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      engine.rotatePage(pageIndex, degrees);
      return engine.exportBytes();
    },

    async extractPages(documentBytes, pageIndices) {
      const engine = new LumvalePDFEngine();
      await engine.loadDocument(documentBytes);
      const doc = await engine.extractPages(pageIndices);
      return doc.save();
    },

    async buildFromSequence(sequence: PageSource[]) {
      const engine = new LumvalePDFEngine();
      await engine.buildFromSequence(
        sequence.map((s) => ({ docBytes: s.documentBytes, pageIndex: s.pageIndex })),
      );
      return engine.exportBytes();
    },
  };
}
