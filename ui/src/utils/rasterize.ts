import { getPDFDocument } from './pdfCache';
import type { Annotation } from '../components/AnnotationOverlay';

/**
 * Renders a specific page of a PDF to an off-screen canvas, applies redaction boxes,
 * and exports it as a high-quality JPEG.
 * 
 * @param documentBytes The original PDF bytes
 * @param pageIndex 1-based page index to render
 * @param annotations Annotations on this page (used for redactions)
 * @returns Uint8Array of the resulting JPEG
 */
export async function rasterizePageWithRedactions(
  documentBytes: Uint8Array,
  pageIndex: number,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const pdf = await getPDFDocument(documentBytes);
  const page = await pdf.getPage(pageIndex); // 1-based in pdfjs
  
  // Render at high resolution (e.g., scale = 3 is good for ~300 DPI on typical letter size)
  const scale = 3;
  const viewport = page.getViewport({ scale, rotation: 0 }); 
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderParams: Parameters<typeof page.render>[0] = {
    canvas,
    canvasContext: ctx,
    viewport,
  };

  await page.render(renderParams).promise;
  
  // Draw the redaction boxes on top of the rendered image
  for (const ann of annotations) {
    if (ann.type === 'redact') {
      ctx.fillStyle = '#000000';
      for (const r of ann.rects) {
        // The rects are in scale=1 coordinate space
        ctx.fillRect(r.x * scale, r.y * scale, r.width * scale, r.height * scale);
      }
    }
  }
  
  // Convert to JPEG image bytes
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas toBlob failed"));
      blob.arrayBuffer().then(ab => resolve(new Uint8Array(ab))).catch(reject);
    }, 'image/jpeg', 0.95);
  });
}
