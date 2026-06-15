import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  // demo1.pdf — single page
  const doc1 = await PDFDocument.create();
  const page1 = doc1.addPage([500, 500]);
  page1.drawText('Demo PDF 1', {x: 50, y: 400});
  fs.writeFileSync(path.join(__dirname, 'demo1.pdf'), await doc1.save());

  // demo2.pdf — single page
  const doc2 = await PDFDocument.create();
  const page2 = doc2.addPage([500, 500]);
  page2.drawText('Demo PDF 2', {x: 50, y: 400});
  fs.writeFileSync(path.join(__dirname, 'demo2.pdf'), await doc2.save());

  // demo-multipage.pdf — 5 pages used by sidebar-sync tests
  const multiDoc = await PDFDocument.create();
  const font = await multiDoc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 5; i++) {
    const p = multiDoc.addPage([595, 842]); // A4 portrait
    p.drawText(`Page ${i} of 5`, {
      x: 50,
      y: 750,
      size: 24,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    p.drawText(`This is the content of page ${i}.`, {
      x: 50,
      y: 700,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  fs.writeFileSync(path.join(__dirname, 'demo-multipage.pdf'), await multiDoc.save());

  console.log('Generated demo1.pdf, demo2.pdf, and demo-multipage.pdf');
}

run();
