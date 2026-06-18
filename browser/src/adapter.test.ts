import { describe, it, expect } from 'vitest';
import { BrowserDocumentConverter } from './adapter';

// Routing/classification only — the actual conversions need a DOM and are
// covered by the consuming app's browser e2e tests.
const conv = new BrowserDocumentConverter();
const input = (over: Partial<{ fileName: string; mimeType: string }>) => ({
  bytes: new Uint8Array(),
  ...over,
});

describe('BrowserDocumentConverter', () => {
  it('has a stable id', () => {
    expect(conv.id).toBe('browser-dom');
  });

  it('recognizes supported formats by extension', () => {
    for (const name of ['a.docx', 'b.xlsx', 'c.pptx', 'd.md']) {
      expect(conv.canConvert(input({ fileName: name }))).toBe(true);
    }
  });

  it('recognizes supported formats by MIME type', () => {
    const mimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/markdown',
      'image/png',
      'image/jpeg',
    ];
    for (const mimeType of mimes) {
      expect(conv.canConvert(input({ mimeType }))).toBe(true);
    }
  });

  it('does not claim PDFs or unknown inputs', () => {
    expect(conv.canConvert(input({ fileName: 'x.pdf', mimeType: 'application/pdf' }))).toBe(false);
    expect(conv.canConvert(input({ fileName: 'x.txt' }))).toBe(false);
    expect(conv.canConvert(input({}))).toBe(false);
  });

  it('rejects an unsupported input from toPdf', async () => {
    await expect(conv.toPdf(input({ fileName: 'x.pdf' }))).rejects.toThrow(/cannot convert/i);
  });
});
