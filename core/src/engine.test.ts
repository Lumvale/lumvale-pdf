import { describe, it, expect, beforeEach } from 'vitest';
import { LumvalePDFEngine } from './index';

describe('LumvalePDFEngine - Bates Numbering', () => {
  let engine: LumvalePDFEngine;

  beforeEach(async () => {
    engine = new LumvalePDFEngine();
    await engine.createEmptyDocument();
  });

  it('adds Bates numbering to the document', async () => {
    // Generate a quick mock document with 3 pages
    for (let i = 0; i < 3; i++) {
        const doc = await engine.exportBytes();
        const newEngine = new LumvalePDFEngine();
        const pdoc = await newEngine.loadDocument(doc);
        pdoc.addPage([500, 500]);
        const b = await newEngine.exportBytes();
        await engine.loadDocument(b);
    }

    expect(engine.getMetadata()).toBeDefined();

    engine.addBatesNumbering({
      prefix: 'EXH-',
      startNumber: 1,
      numberOfDigits: 3,
      fontSize: 12,
      colorHex: '#FF0000',
      x: 10,
      y: 10
    });

    const bytes = await engine.exportBytes();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
