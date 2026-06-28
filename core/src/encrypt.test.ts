import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import { LumvalePDFEngine, computePermissions } from './index';

/** Read the /Encrypt /P value back out of an encrypted PDF. */
async function readPermissions(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const ctx = doc.context as any;
  const encDict = ctx.lookup(ctx.trailerInfo.Encrypt);
  return (encDict.get(PDFName.of('P')) as PDFNumber).asNumber();
}

describe('computePermissions', () => {
  it('defaults to -4 (all allowed) — unchanged behaviour', () => {
    expect(computePermissions()).toBe(-4);
    expect(computePermissions({})).toBe(-4);
  });

  it('denying printing clears the print (3) and high-res print (12) bits', () => {
    const p = computePermissions({ printing: false });
    expect(p & 0x4).toBe(0);    // bit 3
    expect(p & 0x800).toBe(0);  // bit 12
    expect(p & 0x10).toBe(0x10); // copying still allowed
  });

  it('denying copying clears only the copy (5) bit', () => {
    const p = computePermissions({ copying: false });
    expect(p & 0x10).toBe(0);    // bit 5 cleared
    expect(p & 0x4).toBe(0x4);   // printing still allowed
  });

  it('combines multiple denials', () => {
    const p = computePermissions({ modifying: false, documentAssembly: false });
    expect(p & 0x8).toBe(0);     // bit 4
    expect(p & 0x400).toBe(0);   // bit 11
    expect(p & 0x10).toBe(0x10); // copying untouched
  });
});

describe('exportEncryptedBytes permissions', () => {
  let engine: LumvalePDFEngine;
  beforeEach(async () => {
    engine = new LumvalePDFEngine();
    await engine.createEmptyDocument();
  });

  it('writes /P = -4 by default', async () => {
    const bytes = await engine.exportEncryptedBytes('user', 'owner');
    expect(await readPermissions(bytes)).toBe(-4);
  });

  it('writes a restricted /P that survives a round-trip', async () => {
    const bytes = await engine.exportEncryptedBytes('user', 'owner', { printing: false, copying: false });
    const p = await readPermissions(bytes);
    expect(p & 0x4).toBe(0);   // print denied
    expect(p & 0x10).toBe(0);  // copy denied
    expect(p & 0x8).toBe(0x8); // modify still allowed
    expect(p).toBe(computePermissions({ printing: false, copying: false }));
  });

  it('throws when restricting permissions without a distinct owner password', async () => {
    await expect(engine.exportEncryptedBytes('user', '', { printing: false })).rejects.toThrow(
      /distinct owner password/i,
    );
    await expect(engine.exportEncryptedBytes('same', 'same', { printing: false })).rejects.toThrow(
      /distinct owner password/i,
    );
  });

  it('still allows plain encryption with no permissions argument', async () => {
    const bytes = await engine.exportEncryptedBytes('user', 'owner');
    expect(bytes.length).toBeGreaterThan(0);
  });
});
