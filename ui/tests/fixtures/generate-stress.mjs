import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';

async function generate() {
  console.log('Generating 1000 page PDF...');
  const doc = await PDFDocument.create();
  
  for (let i = 1; i <= 1000; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Test Document - Page ${i}`, {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0, 0, 0),
    });
    for (let j = 0; j < 50; j++) {
      page.drawRectangle({
        x: Math.random() * 500,
        y: Math.random() * 700,
        width: 10,
        height: 10,
        color: rgb(Math.random(), Math.random(), Math.random())
      });
    }
  }

  const bytes = await doc.save();
  fs.writeFileSync('demo-1000.pdf', bytes);
  console.log('Generated demo-1000.pdf');
}

generate().catch(console.error);
