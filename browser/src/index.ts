/**
 * @lumvale/pdf-browser — browser-platform document functionality.
 *
 * Code here requires a live DOM (it uses docx-preview, html2canvas, jsPDF). It
 * runs in a browser tab, an Electron renderer, or headless Chromium — never in a
 * plain Node process. First resident: document → PDF conversion, exposed both as
 * standalone functions and as a {@link BrowserDocumentConverter} implementing
 * core's `DocumentConverter` port.
 *
 * See docs/adr/0001-package-architecture.md.
 */
export {
  convertWordToPDF,
  convertExcelToPDF,
  convertMarkdownToPDF,
  convertPPTXToPDF,
  convertImageToPDF,
  mergePDFs,
} from './conversion';

export { BrowserDocumentConverter } from './adapter';
