import { renderAsync } from 'docx-preview';
import { read, utils } from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { init as initPptx } from 'pptx-preview';

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
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        // Small epsilon to avoid blank trailing page
        while (heightLeft > 1) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

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

    await new Promise(r => setTimeout(r, 1000)); // wait for fonts/images to render

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const A4_CSS_HEIGHT = 1122; // 800px * 1.4025 (Standard A4 ratio)

    // docx-preview with inWrapper: false appends <style> tags and a <section class="docx"><article>...</article></section>
    // To preserve styles and layout, we find the deepest container, extract its children, and clone the empty shell for each page!
    
    const docxSection = container.querySelector('.docx');
    const article = docxSection ? docxSection.querySelector('article') : null;
    const contentParent = article || docxSection || container;
    
    const paragraphs = Array.from(contentParent.childNodes);
    contentParent.innerHTML = ''; // Empty the original shell

    const pages: HTMLElement[] = [];
    let currentContainer: HTMLElement;
    let currentContentParent: HTMLElement;
    
    const createPage = () => {
      currentContainer = container.cloneNode(true) as HTMLElement;
      currentContainer.style.height = A4_CSS_HEIGHT + 'px';
      currentContainer.style.overflow = 'hidden';
      
      const cSection = currentContainer.querySelector('.docx');
      currentContentParent = ((cSection ? cSection.querySelector('article') : null) || cSection || currentContainer) as HTMLElement;
      
      document.body.appendChild(currentContainer);
      pages.push(currentContainer);
    };

    createPage();

    for (const p of paragraphs) {
      currentContentParent!.appendChild(p);
      
      // If the content exceeds the A4 height, move it to a new page
      if (currentContainer!.scrollHeight > A4_CSS_HEIGHT && currentContentParent!.childNodes.length > 1) {
        currentContentParent!.removeChild(p);
        
        // Widow/Orphan control: don't leave headings stranded at the bottom of a page
        const orphans: Node[] = [p];
        let moved = true;
        while (moved && currentContentParent!.lastChild) {
          moved = false;
          const last = currentContentParent!.lastChild as HTMLElement;
          // Heuristic to detect headings (since docx-preview often uses <p> with inline styles or classes)
          let isHeading = false;
          if (last.tagName && last.tagName.match(/^H[1-6]$/i)) {
            isHeading = true;
          } else if (last.className && typeof last.className === 'string' && last.className.toLowerCase().includes('heading')) {
            isHeading = true;
          } else if (last.innerText) {
            const text = last.innerText.trim();
            // Headings are typically short and either bold or prefixed with numbering
            if (text.length > 0 && text.length <= 150) {
              if (text.match(/^[A-Z0-9]{1,3}\.\s/i)) {
                isHeading = true;
              } else {
                // Check if it's bold
                const isBold = last.style.fontWeight === 'bold' || 
                               last.style.fontWeight === '700' || 
                               (last.querySelector && !!last.querySelector('strong, b'));
                if (isBold) isHeading = true;
              }
            }
          }
          if (isHeading) {
            orphans.unshift(last);
            currentContentParent!.removeChild(last);
            moved = true;
          }
        }
        
        createPage();
        
        // Append all pulled orphans to the new page
        for (const orphan of orphans) {
          currentContentParent!.appendChild(orphan);
        }
      }
    }
    
    document.body.removeChild(container);

    let isFirst = true;
    for (const page of pages) {
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      if (!isFirst) {
        pdf.addPage([pdfWidth, pageHeight], 'portrait');
      }
      
      // The canvas perfectly matches the A4 ratio, so we can draw it perfectly to the page bounds
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pageHeight);
      isFirst = false;
      
      document.body.removeChild(page);
    }

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
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;
  const { marked } = await import('marked');

  const textDecoder = new TextDecoder('utf-8');
  const markdownText = textDecoder.decode(fileBytes);
  const htmlContent = await marked.parse(markdownText);

  // We use the same paginated rendering strategy as Word to ensure proper A4 pagination
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px'; 
  container.className = 'markdown-preview';
  
  const article = document.createElement('article');
  article.className = 'markdown-body p-12 text-black';
  article.innerHTML = htmlContent;
  container.appendChild(article);
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const A4_CSS_HEIGHT = 1122; 

    // Extract all top-level markdown elements (p, h1, ul, pre, etc)
    const paragraphs = Array.from(article.childNodes);
    article.innerHTML = ''; // Empty the container

    const pages: HTMLElement[] = [];
    let currentContainer: HTMLElement;
    let currentArticle: HTMLElement;

    const createPage = () => {
      currentContainer = document.createElement('div');
      currentContainer.style.width = '800px';
      currentContainer.style.height = A4_CSS_HEIGHT + 'px';
      currentContainer.style.overflow = 'hidden';
      currentContainer.style.position = 'absolute';
      currentContainer.style.left = '-9999px';
      currentContainer.style.top = '0';
      currentContainer.style.backgroundColor = 'white';
      currentContainer.className = 'markdown-preview';
      
      currentArticle = document.createElement('article');
      currentArticle.className = 'markdown-body p-12 text-black';
      currentContainer.appendChild(currentArticle);
      
      document.body.appendChild(currentContainer);
      pages.push(currentContainer);
    };

    createPage();

    for (const p of paragraphs) {
      currentArticle!.appendChild(p);
      
      if (currentContainer!.scrollHeight > A4_CSS_HEIGHT && currentArticle!.childNodes.length > 1) {
        currentArticle!.removeChild(p);
        
        // Widow/Orphan control: don't leave headings stranded at the bottom of a page
        const orphans: Node[] = [p];
        let moved = true;
        while (moved && currentArticle!.lastChild) {
          moved = false;
          const last = currentArticle!.lastChild as HTMLElement;
          
          // In marked.js HTML, there are often empty text nodes (newlines) between elements
          if (last.nodeType === Node.TEXT_NODE && !last.textContent?.trim()) {
            orphans.unshift(last);
            currentArticle!.removeChild(last);
            moved = true;
            continue;
          }
          
          let isHeading = false;
          
          if (last.tagName && last.tagName.match(/^H[1-6]$/i)) {
            isHeading = true;
          } else if (last.innerText) {
            const text = last.innerText.trim();
            if (text.length > 0 && text.length <= 150) {
              if (text.match(/^[A-Z0-9]{1,3}\.\s/i)) {
                isHeading = true;
              } else {
                const isBold = last.style.fontWeight === 'bold' || last.style.fontWeight === '700' || (last.querySelector && !!last.querySelector('strong, b'));
                if (isBold) isHeading = true;
              }
            }
          }
          
          if (isHeading) {
            orphans.unshift(last);
            currentArticle!.removeChild(last);
            moved = true;
          }
        }
        
        createPage();
        
        for (const orphan of orphans) {
          currentArticle!.appendChild(orphan);
        }
      }
    }
    
    document.body.removeChild(container);

    let isFirst = true;
    for (const page of pages) {
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      if (!isFirst) {
        pdf.addPage([pdfWidth, pageHeight], 'portrait');
      }
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pageHeight);
      isFirst = false;
      
      document.body.removeChild(page);
    }

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
