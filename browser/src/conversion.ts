import { renderAsync } from 'docx-preview';
import { read, utils } from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { marked } from 'marked';
import { init as initPptx } from 'pptx-preview';

/**
 * Vertical offsets (in PDF px) at which to draw a full-document image so it
 * tiles cleanly across page-height strips: [0, -pageHeight, -2*pageHeight, ...].
 *
 * This is the page-slicing math shared by the rasterising converters. It is a
 * pure function so it can be unit-tested without a DOM (the surrounding
 * html2canvas/jsPDF work needs a real browser and is covered by app e2e tests).
 *
 * A 1px epsilon avoids emitting a trailing near-empty page when the scaled
 * height is an exact (or all-but-exact) multiple of the page height.
 */
export function pageOffsets(scaledHeight: number, pageHeight: number): number[] {
  if (!(scaledHeight > 0) || !(pageHeight > 0)) return [0];
  const pages = Math.max(1, Math.ceil((scaledHeight - 1) / pageHeight));
  // `0 - …` rather than `-i * …` so the first offset is +0, not -0.
  return Array.from({ length: pages }, (_, i) => 0 - i * pageHeight);
}

/**
 * Creates a hidden iframe, renders HTML content into it,
 * captures it with html2canvas, and generates a PDF.
 */
async function htmlToPdfBytes(htmlContent: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '800px';
    iframe.style.height = '1130px'; 
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    
    document.body.appendChild(iframe);
    
    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error('Failed to access iframe document');
        
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          body { 
            font-family: Cambria, "Times New Roman", serif; 
            background: white; 
            color: black;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          #content-wrapper {
            padding: 60px 80px; /* Standard 1-inch margins roughly */
            box-sizing: border-box;
            width: 100%;
          }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          h1, h2, h3, h4, h5 { color: #222; font-family: "Calibri", "Helvetica Neue", sans-serif; }
          p { margin-bottom: 1em; }
        `;
        iframeDoc.head.appendChild(style);

        const body = iframeDoc.body;
        const wrapper = iframeDoc.createElement('div');
        wrapper.id = 'content-wrapper';
        wrapper.innerHTML = htmlContent;
        body.appendChild(wrapper);

        await new Promise(r => setTimeout(r, 200));

        const canvas = await html2canvas(wrapper, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const scaledHeight = (canvas.height * pdfWidth) / canvas.width;

        // Tile the single capture across page-height strips (shared math with the
        // docx/markdown converters), drawn at its true proportional height so it
        // is never stretched to fill the page.
        pageOffsets(scaledHeight, pageHeight).forEach((position, i) => {
          if (i > 0) pdf.addPage([pdfWidth, pageHeight], 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
        });

        const arrayBuffer = pdf.output('arraybuffer');
        document.body.removeChild(iframe);
        resolve(new Uint8Array(arrayBuffer));
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    };

    iframe.srcdoc = `<!DOCTYPE html><html><head></head><body></body></html>`;
  });
}

/**
 * Converts a Word document (.docx) to PDF
 */
export async function convertWordToPDF(fileBytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.width = '800px';
  container.style.top = '0px';
  container.style.left = '0px';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  try {
    const blob = new Blob([fileBytes as any]);
    await renderAsync(blob, container, undefined, {
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      useBase64URL: true,
    });

    await new Promise(r => setTimeout(r, 1000)); // wait for images to render
    // Wait for web fonts too — rasterising before they load makes html2canvas
    // fall back to different metrics, which manifested as overlapping text.
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch { /* fonts API best-effort */ }
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Rasterise the fully-styled document once, then slice that single tall image
    // into page-height strips. The previous approach paginated by cloning the
    // container and clipping elements at a hardcoded 1122px height, which cut
    // content mid-element and—because that constant didn't match jsPDF's real A4
    // pixel height—vertically stretched each page, producing the overlapping /
    // chopped text. Slicing one continuous capture avoids both problems.
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const scaledHeight = (canvas.height * pdfWidth) / canvas.width;

    pageOffsets(scaledHeight, pageHeight).forEach((position, i) => {
      if (i > 0) pdf.addPage([pdfWidth, pageHeight], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
    });

    const arrayBuffer = pdf.output('arraybuffer');
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    if (container.parentNode) document.body.removeChild(container);
    throw err;
  }
}

/**
 * Converts an Excel spreadsheet (.xlsx) to PDF
 */
export async function convertExcelToPDF(fileBytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const workbook = read(fileBytes, { type: 'array' });
  let html = '<h1>Spreadsheet Export</h1>';
  
  for (const sheetName of workbook.SheetNames) {
    html += `<h2>${sheetName}</h2>`;
    const worksheet = workbook.Sheets[sheetName];
    html += utils.sheet_to_html(worksheet);
  }
  
  return htmlToPdfBytes(html);
}

/**
 * Converts a Markdown file (.md) to PDF
 */
export async function convertMarkdownToPDF(fileBytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const textDecoder = new TextDecoder('utf-8');
  const markdownText = textDecoder.decode(fileBytes);
  const htmlContent = await marked.parse(markdownText);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = 'white';
  container.className = 'markdown-preview';

  const article = document.createElement('article');
  article.className = 'markdown-body p-12 text-black';
  article.innerHTML = htmlContent;
  container.appendChild(article);
  document.body.appendChild(container);

  try {
    // Wait for web fonts so html2canvas measures with the real metrics rather
    // than a fallback face (mismatched metrics manifested as overlapping text).
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch { /* fonts API best-effort */ }
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Same single-capture-then-slice strategy as convertWordToPDF: rasterise the
    // styled markdown once and tile that capture across page-height strips. The
    // previous approach clipped elements at a hardcoded 1122px height and then
    // stretched each slice to the real (taller) A4 page, which chopped content
    // mid-element and squished every page vertically.
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const scaledHeight = (canvas.height * pdfWidth) / canvas.width;

    pageOffsets(scaledHeight, pageHeight).forEach((position, i) => {
      if (i > 0) pdf.addPage([pdfWidth, pageHeight], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
    });

    const arrayBuffer = pdf.output('arraybuffer');
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    if (container.parentNode) document.body.removeChild(container);
    throw err;
  }
}

/**
 * Merges multiple PDFs into a single PDF
 */
export async function mergePDFs(pdfBytesArray: Uint8Array[]): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.create();
  
  for (const pdfBytes of pdfBytesArray) {
    const doc = await PDFDocument.load(pdfBytes);
    const copiedPages = await masterDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => masterDoc.addPage(page));
  }
  
  return await masterDoc.save();
}

/**
 * Converts an image to PDF
 */
export async function convertImageToPDF(fileBytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let image;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    image = await pdfDoc.embedJpg(fileBytes);
  } else {
    image = await pdfDoc.embedPng(fileBytes);
  }

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { width, height } = image.scaleToFit(A4_WIDTH - 40, A4_HEIGHT - 40);
  
  page.drawImage(image, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height,
  });
  
  return await pdfDoc.save();
}

/**
 * Converts a PPTX presentation to PDF
 */
export async function convertPPTXToPDF(fileBytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const container = document.createElement('div');
  container.style.width = '1024px';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);
  
  const pdfDoc = await PDFDocument.create();
  
  try {
    const previewer = initPptx(container, { width: 1024, height: 768 });
    const buffer = fileBytes instanceof Uint8Array ? fileBytes.buffer : fileBytes;
    await previewer.preview(buffer as ArrayBuffer);
    
    await new Promise(r => setTimeout(r, 500));
    
    const slideCount = previewer.slideCount || 1;
    for (let i = 0; i < slideCount; i++) {
       previewer.renderSingleSlide(i);
       await new Promise(r => setTimeout(r, 300));
       
       const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
       });
       
       const imgData = canvas.toDataURL('image/jpeg', 0.95);
       const img = await pdfDoc.embedJpg(imgData);
       const A4_WIDTH = 595.28;
       const A4_HEIGHT = 841.89;
       const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
       const { width, height } = img.scaleToFit(A4_WIDTH - 40, A4_HEIGHT - 40);
       page.drawImage(img, {
         x: (A4_WIDTH - width) / 2,
         y: (A4_HEIGHT - height) / 2,
         width,
         height
       });
    }
  } finally {
    document.body.removeChild(container);
  }
  return await pdfDoc.save();
}
