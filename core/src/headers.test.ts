import { describe, it, expect, beforeEach } from 'vitest';
import { LumvalePDFEngine } from './index';

describe('LumvalePDFEngine - Headers & Footers', () => {
  let engine: LumvalePDFEngine;

  beforeEach(async () => {
    engine = new LumvalePDFEngine();
    await engine.createEmptyDocument();
  });

  it('adds headers and footers with dynamic tokens', async () => {
    // Generate a quick mock document with 3 pages
    for (let i = 0; i < 3; i++) {
        const doc = await engine.exportBytes();
        const newEngine = new LumvalePDFEngine();
        const pdoc = await newEngine.loadDocument(doc);
        pdoc.addPage([500, 500]);
        const b = await newEngine.exportBytes();
        await engine.loadDocument(b);
    }

    engine.addHeadersFooters({
      headerLeft: 'Company Name',
      headerCenter: 'Document Title',
      headerRight: 'Page {pageNumber} of {totalPages}',
      footerLeft: 'Confidential',
      footerCenter: '{date}',
      footerRight: 'Rev 1',
      fontSize: 10,
      colorHex: '#000000',
    });

    const bytes = await engine.exportBytes();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
