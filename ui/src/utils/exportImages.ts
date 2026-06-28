import { loadIsolatedPDFDocument } from './pdfCache';
import JSZip from 'jszip';

export type ImageFormat = 'png' | 'jpeg';

export interface ExportImageOptions {
  format: ImageFormat;
  /** Render scale relative to the PDF's intrinsic size (1 = 72 DPI). */
  scale: number;
  /** JPEG quality 0..1 (ignored for PNG). */
  quality?: number;
  /** Actual 1-based PDF page numbers to export, in the desired output order. */
  pageNumbers: number[];
  /** File name stem used for the downloaded image(s) / zip. */
  baseName: string;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders the requested PDF pages to raster images and downloads them.
 * A single page downloads directly as one image; multiple pages are bundled
 * into a `.zip`. Pages are rendered sequentially to keep memory bounded on
 * large documents.
 *
 * @returns the name of the file that was downloaded.
 */
export async function exportPagesToImages(
  documentBytes: Uint8Array,
  opts: ExportImageOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const { format, scale, quality = 0.92, pageNumbers, baseName } = opts;
  if (pageNumbers.length === 0) throw new Error('No pages selected for export.');

  // Export runs on its OWN document instance, not the shared viewer cache, so the
  // page.cleanup()/destroy() below can't corrupt pages the viewer is rendering.
  const { pdf, destroy } = await loadIsolatedPDFDocument(documentBytes);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  const renderOne = async (pageNum: number): Promise<Blob> => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d')!;
    // JPEG has no alpha channel — paint a white page background so transparent
    // regions don't render as black.
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const renderParams: Parameters<typeof page.render>[0] = { canvas, canvasContext: ctx, viewport };
    await page.render(renderParams).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality),
    );
    // Free the backing store promptly; large exports can accumulate canvases.
    canvas.width = 0;
    canvas.height = 0;
    // Release pdf.js's per-page resources so a large export (hundreds of pages)
    // doesn't grow unbounded in the worker.
    page.cleanup();
    if (!blob) throw new Error('Failed to rasterize page ' + pageNum);
    return blob;
  };

  try {
    const total = pageNumbers.length;

    if (total === 1) {
      const blob = await renderOne(pageNumbers[0]);
      const filename = `${baseName}.${ext}`;
      triggerDownload(blob, filename);
      onProgress?.(1, 1);
      return filename;
    }

    const zip = new JSZip();
    const padWidth = Math.max(2, String(total).length);
    for (let i = 0; i < total; i++) {
      const blob = await renderOne(pageNumbers[i]);
      zip.file(`${baseName}-page-${String(i + 1).padStart(padWidth, '0')}.${ext}`, blob);
      onProgress?.(i + 1, total);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = `${baseName}-images.zip`;
    triggerDownload(zipBlob, filename);
    return filename;
  } finally {
    // All renders are awaited (sequential) before we get here, so destroying the
    // isolated document frees its worker resources without aborting live work.
    destroy();
  }
}
