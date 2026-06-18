import { describe, it, expect } from 'vitest';
import {
  ConverterRegistry,
  ConversionError,
  type ConversionInput,
  type DocumentConverter,
} from './conversion';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const docx: ConversionInput = { bytes: new Uint8Array([1, 2, 3]), fileName: 'a.docx' };

function fakeConverter(
  id: string,
  handles: (i: ConversionInput) => boolean,
  out: Uint8Array = new Uint8Array(PDF_MAGIC)
): DocumentConverter {
  return { id, canConvert: handles, async toPdf() { return out; } };
}

describe('ConverterRegistry', () => {
  it('routes input to a capable converter and returns its bytes', async () => {
    const reg = new ConverterRegistry();
    reg.register(fakeConverter('docx', (i) => i.fileName?.endsWith('.docx') ?? false));

    expect(reg.canConvert(docx)).toBe(true);
    const pdf = await reg.toPdf(docx);
    expect(Array.from(pdf.slice(0, 4))).toEqual(PDF_MAGIC);
  });

  it('tries converters in registration order', () => {
    const reg = new ConverterRegistry()
      .register(fakeConverter('first', () => true, new Uint8Array([1])))
      .register(fakeConverter('second', () => true, new Uint8Array([2])));

    expect(reg.find(docx)?.id).toBe('first');
    expect(reg.list()).toHaveLength(2);
  });

  it('throws ConversionError when nothing handles the input', async () => {
    const reg = new ConverterRegistry();
    expect(reg.canConvert(docx)).toBe(false);
    await expect(reg.toPdf(docx)).rejects.toBeInstanceOf(ConversionError);
  });

  it('wraps adapter failures in ConversionError, preserving the cause', async () => {
    const boom = new Error('render crashed');
    const reg = new ConverterRegistry().register({
      id: 'broken',
      canConvert: () => true,
      async toPdf() { throw boom; },
    });

    await expect(reg.toPdf(docx)).rejects.toMatchObject({
      name: 'ConversionError',
      cause: boom,
    });
  });
});
