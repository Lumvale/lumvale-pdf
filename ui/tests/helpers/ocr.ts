import { createWorker, type Worker } from 'tesseract.js';
import type { Locator } from '@playwright/test';

/**
 * OCR helper for "computer-vision" assertions: instead of only checking that the
 * rendered canvas *changed* after an edit, we read the pixels back to text and
 * assert the edit actually rendered the expected characters (Bates numbers,
 * headers/footers). Runs tesseract.js in the Node test process against a
 * screenshot of the target canvas.
 *
 * A single worker is reused across a spec file (init in beforeAll, terminate in
 * afterAll) because worker startup + language load is the expensive part.
 */
let worker: Worker | null = null;

export async function initOcr(): Promise<void> {
  if (!worker) worker = await createWorker('eng');
}

export async function terminateOcr(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/** A sub-region of the source canvas expressed in 0..1 fractions. */
export interface OcrRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrOptions {
  /** Crop to this fraction of the canvas before OCR (e.g. the footer strip). */
  region?: OcrRegion;
  /** Upscale factor applied to the crop — small stamps OCR poorly at 1x. */
  scale?: number;
}

/**
 * Read a canvas back to text. The pixels are pulled in-page via `toDataURL`
 * (Playwright's element screenshot returns blank for the pdf.js render canvas),
 * optionally cropped to a region and upscaled so small footer/header stamps are
 * legible to tesseract.
 */
export async function ocrCanvas(canvas: Locator, opts: OcrOptions = {}): Promise<string> {
  if (!worker) await initOcr();
  const scale = opts.scale ?? 1;
  const region = opts.region ?? { x: 0, y: 0, w: 1, h: 1 };

  const dataUrl = await canvas.first().evaluate(
    (el, { region, scale }) => {
      const src = el as HTMLCanvasElement;
      const sx = Math.round(src.width * region.x);
      const sy = Math.round(src.height * region.y);
      const sw = Math.round(src.width * region.w);
      const sh = Math.round(src.height * region.h);
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(sw * scale));
      out.height = Math.max(1, Math.round(sh * scale));
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    },
    { region, scale }
  );

  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const { data } = await worker!.recognize(png);
  return data.text.replace(/\s+/g, ' ').trim();
}
