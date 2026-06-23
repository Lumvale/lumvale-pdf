/**
 * Playwright Global Setup — PDF Fixture Generator
 *
 * Runs once before all tests. Uses Playwright's own headless Chromium to
 * render styled HTML and export real browser-quality PDFs via page.pdf().
 * Then post-processes with pdf-lib to inject a proper PDF outline (bookmarks)
 * into the bookmarked fixture.
 *
 * Generated fixtures:
 *  - demo1.pdf            — 1 page, no bookmarks (simple upload test)
 *  - demo2.pdf            — 1 page, no bookmarks (merge test)
 *  - demo-multipage.pdf   — 5 A4 pages, no bookmarks (thumbnail sync tests)
 *  - demo-bookmarked.pdf  — 6 A4 pages with a 3-entry PDF outline (bookmark tests)
 *  - demo-heavy.pdf       — 80 full-page raster pages (~3MB), a non-personal
 *                           stand-in for a scanned filing. Generated locally and
 *                           git-ignored — never commit it. Used by the
 *                           apply-page-number render tests, which need a doc
 *                           that is genuinely expensive to render.
 */

import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PDFDocument,
  PDFName,
  PDFString,
  PDFNull,
  PDFNumber,
  StandardFonts,
  rgb,
} from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, 'fixtures');

// ---------------------------------------------------------------------------
// HTML templates — rendered by Playwright into real PDFs
// ---------------------------------------------------------------------------

const SINGLE_PAGE_HTML = (label: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2.5cm; }
  body { font-family: Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
  h1 { font-size: 3rem; color: #1e293b; text-align: center; }
</style>
</head>
<body><h1>${label}</h1></body>
</html>`;

const MULTIPAGE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2.5cm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; }
  .page { page-break-after: always; min-height: 24cm; padding: 1cm 0; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 2rem; margin: 0 0 1.2rem; color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 0.5rem; }
  p  { font-size: 1rem; line-height: 1.8; color: #475569; }
  .page-num { font-size: 0.8rem; color: #94a3b8; margin-top: 2rem; }
</style>
</head>
<body>
  <div class="page">
    <h1>Page 1 — Introduction</h1>
    <p>Welcome to the VaultPDF test document. This page contains introductory content used to verify that the thumbnail panel correctly identifies and highlights the first page when the document is loaded.</p>
    <p class="page-num">Page 1 of 5</p>
  </div>
  <div class="page">
    <h1>Page 2 — Getting Started</h1>
    <p>This is the second page of the document. It is used to verify that scrolling to page two updates the sidebar's active thumbnail and Viewing badge from page one to page two.</p>
    <p class="page-num">Page 2 of 5</p>
  </div>
  <div class="page">
    <h1>Page 3 — Core Features</h1>
    <p>This is the third page. This page is specifically chosen to test mid-document navigation — clicking thumbnail three should bring the main canvas to this page and the sidebar should auto-scroll to keep this thumbnail visible.</p>
    <p class="page-num">Page 3 of 5</p>
  </div>
  <div class="page">
    <h1>Page 4 — Advanced Topics</h1>
    <p>Page four is used to validate the "only one thumbnail is active at a time" invariant. After navigating here, exactly one thumbnail should carry the data-active="true" attribute and the Viewing badge.</p>
    <p class="page-num">Page 4 of 5</p>
  </div>
  <div class="page">
    <h1>Page 5 — Conclusion</h1>
    <p>The final page. This page is placed far enough down the sidebar thumbnail list to verify that the sidebar panel itself scrolls to bring the page-5 thumbnail into view when the main canvas is scrolled to the end.</p>
    <p class="page-num">Page 5 of 5</p>
  </div>
</body>
</html>`;

const BOOKMARKED_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2.5cm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; }
  .page { page-break-after: always; min-height: 24cm; padding: 1cm 0; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 2rem; margin: 0 0 0.5rem; color: #0f172a; }
  .subtitle { font-size: 0.85rem; color: #6366f1; margin-bottom: 1.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  p  { font-size: 1rem; line-height: 1.8; color: #475569; }
  .page-num { font-size: 0.8rem; color: #94a3b8; margin-top: 2rem; }
</style>
</head>
<body>
  <div class="page">
    <div class="subtitle">Bookmark Target: Introduction</div>
    <h1>Introduction</h1>
    <p>This page is the target of the first PDF bookmark ("Introduction"). When the user clicks this bookmark in the sidebar, the viewer should scroll here and the bookmark row should receive a full active highlight immediately on the first click.</p>
    <p class="page-num">Page 1 of 6</p>
  </div>
  <div class="page">
    <h1>Between Bookmarks</h1>
    <p>This page sits between the "Introduction" bookmark (page 1) and the "Chapter 1" bookmark (page 3). When the user scrolls to this page, the "Introduction" bookmark should remain dimly highlighted to indicate the reader is still in that section.</p>
    <p class="page-num">Page 2 of 6</p>
  </div>
  <div class="page">
    <div class="subtitle">Bookmark Target: Chapter 1</div>
    <h1>Chapter 1 — Getting Started</h1>
    <p>This page is the target of the second PDF bookmark ("Chapter 1"). Scrolling to this page should cause the "Introduction" bookmark to lose its highlight and "Chapter 1" to receive the full active highlight.</p>
    <p class="page-num">Page 3 of 6</p>
  </div>
  <div class="page">
    <h1>Between Bookmarks</h1>
    <p>Another inter-section page, sitting between "Chapter 1" (page 3) and "Chapter 2" (page 5). The "Chapter 1" bookmark should remain dimly visible here.</p>
    <p class="page-num">Page 4 of 6</p>
  </div>
  <div class="page">
    <div class="subtitle">Bookmark Target: Chapter 2</div>
    <h1>Chapter 2 — Advanced Topics</h1>
    <p>This page is the target of the third and final PDF bookmark ("Chapter 2"). All other bookmarks should be un-highlighted when this page is active.</p>
    <p class="page-num">Page 5 of 6</p>
  </div>
  <div class="page">
    <h1>Appendix</h1>
    <p>A trailing appendix page after all bookmark targets. "Chapter 2" should remain dimly highlighted here since there is no next bookmark to take over.</p>
    <p class="page-num">Page 6 of 6</p>
  </div>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Inject a PDF outline (bookmarks) into existing PDF bytes using pdf-lib
// low-level context API. pdf-lib has no high-level outline API so we
// manually create the Outlines dictionary and item entries.
// ---------------------------------------------------------------------------

interface OutlineEntry {
  title: string;
  pageIndex: number; // 0-based
}

async function injectOutline(
  pdfBytes: Uint8Array,
  entries: OutlineEntry[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  // Allocate a ref for the Outlines root
  const outlinesRef = doc.context.nextRef();

  // Allocate refs for each item
  const itemRefs = entries.map(() => doc.context.nextRef());

  // Build each item dictionary
  entries.forEach((entry, i) => {
    const pageRef = pages[entry.pageIndex].ref;
    const itemDict: Record<string, any> = {
      Title: PDFString.of(entry.title),
      Parent: outlinesRef,
      // XYZ destination: scroll to top-left of the page at current zoom
      Dest: doc.context.obj([pageRef, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]),
    };
    if (i > 0) itemDict['Prev'] = itemRefs[i - 1];
    if (i < entries.length - 1) itemDict['Next'] = itemRefs[i + 1];

    doc.context.assign(itemRefs[i], doc.context.obj(itemDict));
  });

  // Build the Outlines root dictionary
  doc.context.assign(
    outlinesRef,
    doc.context.obj({
      Type: PDFName.of('Outlines'),
      First: itemRefs[0],
      Last: itemRefs[itemRefs.length - 1],
      Count: PDFNumber.of(entries.length),
    })
  );

  // Wire the catalog to point at the Outlines root
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);

  return doc.save();
}

// ---------------------------------------------------------------------------
// Heavy raster fixture — a non-personal stand-in for a scanned document.
// Every page is a full-page image so each pdf.js render is genuinely expensive,
// which is what makes the apply-page-number render regressions reproducible.
// Kept out of git (see .gitignore) and generated on demand below.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Build a minimal truecolor PNG from a noisy gradient (doesn't compress away and
// is costly to rasterize, like a scanned page).
function makeNoisyPng(width: number, height: number): Buffer {
  const bytesPerRow = width * 3;
  const raw = Buffer.alloc((bytesPerRow + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (bytesPerRow + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const o = y * (bytesPerRow + 1) + 1 + x * 3;
      raw[o] = (x ^ y) & 0xff;
      raw[o + 1] = (x * 2 + y) & 0xff;
      raw[o + 2] = ((x + y * 3) & 0xff) ^ ((Math.random() * 32) | 0);
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function generateHeavyFixture(outPath: string, pageCount = 80): Promise<void> {
  const doc = await PDFDocument.create();
  // One large image reused on every page keeps the file small while still being
  // slow to rasterize at high DPI.
  const img = await doc.embedPng(makeNoisyPng(900, 1200));
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([612, 792]);
    page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
    page.drawText(`Heavy fixture page ${i}`, { x: 24, y: 760, size: 14, color: rgb(1, 1, 1) });
  }
  fs.writeFileSync(outPath, await doc.save());
}

// ---------------------------------------------------------------------------
// Global setup entry point
// ---------------------------------------------------------------------------

export default async function globalSetup(_config: FullConfig) {
  // Ensure fixtures directory exists
  fs.mkdirSync(FIXTURES, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[fixture-gen] Generating PDF fixtures with Playwright...');

  // 1. demo1.pdf — single page
  await page.setContent(SINGLE_PAGE_HTML('Demo PDF 1'), { waitUntil: 'load' });
  const demo1 = await page.pdf({ format: 'A4', printBackground: false });
  fs.writeFileSync(path.join(FIXTURES, 'demo1.pdf'), demo1);
  console.log('[fixture-gen] ✓ demo1.pdf');

  // 2. demo2.pdf — single page
  await page.setContent(SINGLE_PAGE_HTML('Demo PDF 2'), { waitUntil: 'load' });
  const demo2 = await page.pdf({ format: 'A4', printBackground: false });
  fs.writeFileSync(path.join(FIXTURES, 'demo2.pdf'), demo2);
  console.log('[fixture-gen] ✓ demo2.pdf');

  // 3. demo-multipage.pdf — 5 pages, no bookmarks
  await page.setContent(MULTIPAGE_HTML, { waitUntil: 'load' });
  const multipage = await page.pdf({ format: 'A4', printBackground: true });
  fs.writeFileSync(path.join(FIXTURES, 'demo-multipage.pdf'), multipage);
  console.log('[fixture-gen] ✓ demo-multipage.pdf (5 pages)');

  // 4. demo-bookmarked.pdf — 6 pages + PDF outline injected by pdf-lib
  await page.setContent(BOOKMARKED_HTML, { waitUntil: 'load' });
  const bookmarkedRaw = await page.pdf({ format: 'A4', printBackground: true });
  const bookmarkedWithOutline = await injectOutline(bookmarkedRaw, [
    { title: 'Introduction', pageIndex: 0 },
    { title: 'Chapter 1 — Getting Started', pageIndex: 2 },
    { title: 'Chapter 2 — Advanced Topics', pageIndex: 4 },
  ]);
  fs.writeFileSync(path.join(FIXTURES, 'demo-bookmarked.pdf'), bookmarkedWithOutline);
  console.log('[fixture-gen] ✓ demo-bookmarked.pdf (6 pages, 3 bookmarks)');

  await browser.close();

  // 5. demo-heavy.pdf — large raster fixture (git-ignored). Only (re)generate
  //    when missing; it's ~3MB and slow to build, and its contents don't change.
  const heavyPath = path.join(FIXTURES, 'demo-heavy.pdf');
  if (fs.existsSync(heavyPath)) {
    console.log('[fixture-gen] ✓ demo-heavy.pdf (cached)');
  } else {
    console.log('[fixture-gen] … demo-heavy.pdf (generating, ~3MB)');
    await generateHeavyFixture(heavyPath);
    console.log('[fixture-gen] ✓ demo-heavy.pdf (80 pages)');
  }

  console.log('[fixture-gen] All fixtures ready.\n');
}
