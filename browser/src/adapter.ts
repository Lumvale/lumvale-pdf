import type { ConversionInput, DocumentConverter } from '@lumvale/pdf-core';
import {
  convertWordToPDF,
  convertExcelToPDF,
  convertMarkdownToPDF,
  convertPPTXToPDF,
  convertImageToPDF,
} from './conversion';

type Kind = 'docx' | 'xlsx' | 'md' | 'pptx' | 'image';

const MIME: Record<Exclude<Kind, 'image'>, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  md: 'text/markdown',
};

function extension(fileName?: string): string {
  return fileName?.split('.').pop()?.toLowerCase() ?? '';
}

function classify(input: ConversionInput): Kind | null {
  const ext = extension(input.fileName);
  const mime = input.mimeType ?? '';
  if (ext === 'docx' || mime === MIME.docx) return 'docx';
  if (ext === 'xlsx' || mime === MIME.xlsx) return 'xlsx';
  if (ext === 'pptx' || mime === MIME.pptx) return 'pptx';
  if (ext === 'md' || mime === MIME.md) return 'md';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

/**
 * Browser implementation of core's {@link DocumentConverter} port. Converts
 * Office documents, Markdown, and images to PDF using a live DOM
 * (docx-preview / html2canvas / jsPDF), so it must run where a DOM exists: a
 * browser tab, an Electron renderer, or headless Chromium.
 *
 * Register it into a `ConverterRegistry` at the app's composition root:
 *
 * ```ts
 * import { ConverterRegistry } from '@lumvale/pdf-core';
 * import { BrowserDocumentConverter } from '@lumvale/pdf-browser';
 * const registry = new ConverterRegistry().register(new BrowserDocumentConverter());
 * const pdf = await registry.toPdf({ bytes, fileName: 'report.docx' });
 * ```
 */
export class BrowserDocumentConverter implements DocumentConverter {
  readonly id = 'browser-dom';

  canConvert(input: ConversionInput): boolean {
    return classify(input) !== null;
  }

  async toPdf(input: ConversionInput): Promise<Uint8Array> {
    switch (classify(input)) {
      case 'docx':
        return convertWordToPDF(input.bytes);
      case 'xlsx':
        return convertExcelToPDF(input.bytes);
      case 'md':
        return convertMarkdownToPDF(input.bytes);
      case 'pptx':
        return convertPPTXToPDF(input.bytes);
      case 'image':
        return convertImageToPDF(input.bytes, input.mimeType ?? 'image/png');
      default:
        throw new Error(
          `BrowserDocumentConverter cannot convert ${input.fileName ?? input.mimeType ?? 'input'}`,
        );
    }
  }
}
