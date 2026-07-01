import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import { LumvalePDFEngine } from './index';

/**
 * Engine-level coverage for annotation persistence — the layer where two silent
 * data-loss bugs lived (flatten ink via a non-rendering drawSvgPath; native save
 * throwing on the Annots guard). Locks the supported types through a
 * flatten/native + extract + save round-trip.
 *
 * Support note (see Workspace.generateFinalPdfBytes): the UI only exposes ink /
 * highlight / text / redact. rectangle/circle/image exist in the type system but
 * have no toolbar entry, and the engine's circle (flatten+native) and
 * image/circle (native) branches are unimplemented — tracked separately.
 */
async function makeOnePageDoc(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  return doc.save();
}

function inkAt(): any {
  return { type: 'ink', color: '#FF3B30', strokeWidth: 4, paths: [[{ x: 100, y: 100 }, { x: 400, y: 400 }]] };
}
function highlightAt(): any {
  return { type: 'highlight', color: '#FFD400', rects: [{ x: 100, y: 100, width: 200, height: 20 }] };
}
function rectangleAt(): any {
  return { type: 'rectangle', color: '#0000FF', strokeWidth: 2, rects: [{ x: 100, y: 100, width: 150, height: 80 }] };
}
function textAt(): any {
  return { type: 'text', color: '#000000', x: 120, y: 120, fontSize: 18, text: 'STAMP' };
}

async function saveWithAnnotation(mode: 'flatten' | 'native', ann: any): Promise<Uint8Array> {
  const engine = new LumvalePDFEngine();
  await engine.loadDocument(await makeOnePageDoc());
  if (mode === 'native') await engine.addNativeAnnotations(0, [ann]);
  else await engine.addFlattenedAnnotations(0, [ann]);
  const doc = await engine.extractPages([0]);
  return doc.save();
}

describe('LumvalePDFEngine — annotation persistence', () => {
  const supported = [
    ['ink', inkAt()],
    ['highlight', highlightAt()],
    ['rectangle', rectangleAt()],
    ['text', textAt()],
  ] as const;

  describe('flatten does not throw and yields a valid PDF', () => {
    for (const [name, ann] of supported) {
      it(`flattens ${name}`, async () => {
        const bytes = await saveWithAnnotation('flatten', ann);
        expect(bytes.length).toBeGreaterThan(0);
        // Reloads cleanly (valid PDF).
        await expect(PDFDocument.load(bytes)).resolves.toBeTruthy();
      });
    }
  });

  describe('native writes a real PDF annotation that survives extract', () => {
    for (const [name, ann] of supported) {
      it(`natively saves ${name}`, async () => {
        const bytes = await saveWithAnnotation('native', ann);
        const doc = await PDFDocument.load(bytes);
        const annots = doc.getPages()[0].node.lookup(PDFName.of('Annots'));
        expect(annots instanceof PDFArray && annots.size()).toBeGreaterThanOrEqual(1);
      });
    }
  });

  it('native save does not throw on a page that has no Annots array (guard regression)', async () => {
    // makeOnePageDoc() has no Annots — the old lookup(key, PDFArray) guard threw
    // here and silently dropped the annotation.
    await expect(saveWithAnnotation('native', inkAt())).resolves.toBeInstanceOf(Uint8Array);
  });
});
