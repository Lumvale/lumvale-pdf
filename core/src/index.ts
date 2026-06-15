import { PDFDocument, degrees, rgb, PDFName, PDFDict, PDFArray, PDFNumber, PDFString, PDFHexString } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

/**
 * LumvalePDF Engine
 * 
 * Core wrapper around the PDF engine.
 */
export class LumvalePDFEngine {
  private pdfDoc: PDFDocument | null = null;

  public getMetadata(): PDFMetadata {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const creator = this.pdfDoc.getCreator();
    const producer = this.pdfDoc.getProducer();
    
    return {
      title: this.pdfDoc.getTitle(),
      author: this.pdfDoc.getAuthor(),
      subject: this.pdfDoc.getSubject(),
      keywords: this.pdfDoc.getKeywords(),
      creator: creator && creator.includes('pdf-lib') ? '' : creator,
      producer: producer && producer.includes('pdf-lib') ? '' : producer,
      creationDate: this.pdfDoc.getCreationDate(),
      modificationDate: this.pdfDoc.getModificationDate(),
    };
  }

  public updateMetadata(metadata: Partial<PDFMetadata>) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    if (metadata.title !== undefined) this.pdfDoc.setTitle(metadata.title);
    if (metadata.author !== undefined) this.pdfDoc.setAuthor(metadata.author);
    if (metadata.subject !== undefined) this.pdfDoc.setSubject(metadata.subject);
    if (metadata.keywords !== undefined) this.pdfDoc.setKeywords([metadata.keywords]);
    if (metadata.creator !== undefined) this.pdfDoc.setCreator(metadata.creator);
    if (metadata.producer !== undefined) this.pdfDoc.setProducer(metadata.producer);
  }

  /**
   * Rotate a specific page by a given angle
   * @param pageIndex 0-based page index
   * @param angle Angle to rotate by (default 90)
   */
  public rotatePage(pageIndex: number, angle: number = 90) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const page = this.pdfDoc.getPage(pageIndex);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  }

  /**
   * Replace a page with a full-size image (used for secure redaction)
   */
  public async replacePageWithImage(pageIndex: number, imageBytes: Uint8Array, isPng: boolean = false) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    
    const oldPage = this.pdfDoc.getPage(pageIndex);
    const { width, height } = oldPage.getSize();
    const rotation = oldPage.getRotation();

    // Embed the rasterized image
    const image = isPng 
      ? await this.pdfDoc.embedPng(imageBytes) 
      : await this.pdfDoc.embedJpg(imageBytes);

    // Create a new blank page at the same index
    const newPage = this.pdfDoc.insertPage(pageIndex, [width, height]);
    newPage.setRotation(rotation);

    // Draw the image onto the new page
    newPage.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    // Remove the old vector page
    this.pdfDoc.removePage(pageIndex + 1);
  }

  /**
   * Add a text watermark to specific pages or all pages.
   */
  public addWatermark(options: { 
    text: string, 
    fontSize: number, 
    opacity: number, 
    angle: number, 
    colorHex: string, 
    pageIndices?: number[] 
  }) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const { text, fontSize, opacity, angle, colorHex, pageIndices } = options;
    
    // Parse hex color (e.g. #FF0000)
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;
    
    const pages = this.pdfDoc.getPages();
    const indicesToWatermark = pageIndices || pages.map((_, i) => i);

    for (const index of indicesToWatermark) {
      if (index >= 0 && index < pages.length) {
        const page = pages[index];
        const { width, height } = page.getSize();
        
        // Rough centering. Actual text width requires font embedding and measurement,
        // but an approximation works fine for simple watermarks.
        const approxTextWidth = (text.length * fontSize) * 0.5;
        
        page.drawText(text, {
          x: width / 2 - approxTextWidth / 2,
          y: height / 2 - fontSize / 2,
          size: fontSize,
          color: rgb(r, g, b),
          opacity: opacity,
          rotate: degrees(angle),
        });
      }
    }
  }

  /**
   * Applies flattened annotations permanently to the document
   */
  public async addFlattenedAnnotations(pageIndex: number, annotations: any[]) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const pages = this.pdfDoc.getPages();
    const page = pages[pageIndex];
    if (!page) return;
    const { height } = page.getSize();

    for (const ann of annotations) {
      const { r, g, b } = this.hexToRgb(ann.color);
      
      if (ann.type === 'ink') {
        for (const pts of ann.paths) {
          const d = pts.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${height - p.y}`).join(' ');
          page.drawSvgPath(d, {
            borderColor: rgb(r, g, b),
            borderWidth: ann.strokeWidth,
          });
        }
      } else if (ann.type === 'highlight') {
        for (const rect of ann.rects) {
          page.drawRectangle({
            x: rect.x,
            y: height - rect.y - rect.height,
            width: rect.width,
            height: rect.height,
            color: rgb(r, g, b),
            opacity: 0.4,
          });
        }
      } else if (ann.type === 'rectangle') {
        for (const rect of ann.rects) {
          page.drawRectangle({
            x: rect.x,
            y: height - rect.y - rect.height,
            width: rect.width,
            height: rect.height,
            borderColor: rgb(r, g, b),
            borderWidth: ann.strokeWidth || 2,
          });
        }
      } else if (ann.type === 'text') {
        page.drawText(ann.text, {
          x: ann.x,
          y: height - ann.y - ann.fontSize,
          size: ann.fontSize,
          color: rgb(r, g, b),
        });
      } else if (ann.type === 'image') {
        const imageBytes = Uint8Array.from(atob(ann.dataUrl.split(',')[1]), c => c.charCodeAt(0));
        let pdfImage;
        if (ann.dataUrl.startsWith('data:image/png')) {
          pdfImage = await this.pdfDoc.embedPng(imageBytes);
        } else {
          pdfImage = await this.pdfDoc.embedJpg(imageBytes);
        }
        page.drawImage(pdfImage, {
          x: ann.x,
          y: height - ann.y - ann.height,
          width: ann.width,
          height: ann.height,
        });
      }
    }
  }

  /**
   * Helper to convert Hex to RGB
   */
  private hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  }

  /**
   * Applies editable Native PDF annotations
   */
  public async addNativeAnnotations(pageIndex: number, annotations: any[]) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const pages = this.pdfDoc.getPages();
    const page = pages[pageIndex];
    if (!page) return;
    const { height } = page.getSize();
    
    // Ensure the page has an Annots array
    let annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
    if (!annots) {
      annots = this.pdfDoc.context.obj([]);
      page.node.set(PDFName.of('Annots'), annots);
    }

    for (const ann of annotations) {
      const { r, g, b } = this.hexToRgb(ann.color);
      const colorArr = this.pdfDoc.context.obj([r, g, b]);
      
      if (ann.type === 'ink') {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const inkLists: any[] = [];
        
        for (const pts of ann.paths) {
          const inkList = [];
          for (const p of pts) {
            const px = p.x;
            const py = height - p.y;
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
            inkList.push(this.pdfDoc.context.obj(px));
            inkList.push(this.pdfDoc.context.obj(py));
          }
          inkLists.push(this.pdfDoc.context.obj(inkList));
        }
        
        const pad = ann.strokeWidth;
        const rect = this.pdfDoc.context.obj([minX - pad, minY - pad, maxX + pad, maxY + pad]);

        const annotDict = this.pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Ink',
          Rect: rect,
          InkList: inkLists,
          C: colorArr,
          BS: this.pdfDoc.context.obj({ W: ann.strokeWidth }),
          F: 4, 
        });
        
        annots.push(this.pdfDoc.context.register(annotDict));
        
      } else if (ann.type === 'highlight') {
        for (const rbox of ann.rects) {
          const rx = rbox.x;
          const ry = height - rbox.y - rbox.height;
          const rect = this.pdfDoc.context.obj([rx, ry, rx + rbox.width, ry + rbox.height]);
          const quadPoints = this.pdfDoc.context.obj([
            rx, ry + rbox.height, // Top Left
            rx + rbox.width, ry + rbox.height, // Top Right
            rx, ry, // Bottom Left
            rx + rbox.width, ry // Bottom Right
          ]);

          const annotDict = this.pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Highlight',
            Rect: rect,
            QuadPoints: quadPoints,
            C: colorArr,
            F: 4,
          });
          
          annots.push(this.pdfDoc.context.register(annotDict));
        }
      } else if (ann.type === 'rectangle') {
        for (const rbox of ann.rects) {
          const rx = rbox.x;
          const ry = height - rbox.y - rbox.height;
          const rect = this.pdfDoc.context.obj([rx, ry, rx + rbox.width, ry + rbox.height]);

          const annotDict = this.pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Square',
            Rect: rect,
            C: colorArr,
            BS: this.pdfDoc.context.obj({ W: ann.strokeWidth || 2 }),
            F: 4,
          });
          
          annots.push(this.pdfDoc.context.register(annotDict));
        }
      } else if (ann.type === 'text') {
        const ry = height - ann.y - ann.fontSize;
        const rect = this.pdfDoc.context.obj([ann.x, ry, ann.x + 200, ry + ann.fontSize + 10]);
        
        const annotDict = this.pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'FreeText',
          Rect: rect,
          Contents: PDFString.of(ann.text),
          DA: PDFString.of(`0 0 0 rg /Helv ${ann.fontSize} Tf`),
          C: colorArr,
          F: 4,
        });
        
        annots.push(this.pdfDoc.context.register(annotDict));
      }
    }
  }

  /**
   * Create a new blank PDF document
   */
  public async createEmptyDocument() {
    this.pdfDoc = await PDFDocument.create();
    return this.pdfDoc;
  }

  /**
   * Load an existing PDF document from bytes
   */
  public async loadDocument(bytes: Uint8Array) {
    this.pdfDoc = await PDFDocument.load(bytes);
    return this.pdfDoc;
  }

  /**
   * Merge another PDF document into the current one
   */
  public async mergeWith(otherBytes: Uint8Array) {
    if (!this.pdfDoc) throw new Error("No primary document loaded");
    const otherDoc = await PDFDocument.load(otherBytes);
    const copiedPages = await this.pdfDoc.copyPages(otherDoc, otherDoc.getPageIndices());
    copiedPages.forEach((page) => this.pdfDoc!.addPage(page));
    return this.pdfDoc;
  }

  /**
   * Extract specific page indices into a new document
   * @param pageIndices Array of 0-based page indices
   */
  public async extractPages(pageIndices: number[]) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(this.pdfDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    return newDoc;
  }

  /**
   * Build a new document from a specific visual sequence mapped across multiple source documents
   * @param sequence Array defining which document and which 0-based page index to pull
   */
  public async buildFromSequence(sequence: { docBytes: Uint8Array, pageIndex: number }[]) {
    const newDoc = await PDFDocument.create();
    
    // Cache parsed PDFDocuments to avoid re-parsing the same bytes multiple times
    const parsedDocs = new Map<Uint8Array, PDFDocument>();
    
    for (const item of sequence) {
      let sourceDoc = parsedDocs.get(item.docBytes);
      if (!sourceDoc) {
        sourceDoc = await PDFDocument.load(item.docBytes);
        parsedDocs.set(item.docBytes, sourceDoc);
      }
      
      const [copiedPage] = await newDoc.copyPages(sourceDoc, [item.pageIndex]);
      newDoc.addPage(copiedPage);
    }
    
    this.pdfDoc = newDoc;
    return this.pdfDoc;
  }

  /**
   * Compress the document by copying to a new instance (garbage collection)
   */
  public async compressDocument() {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(this.pdfDoc, this.pdfDoc.getPageIndices());
    copiedPages.forEach((page) => newDoc.addPage(page));
    this.pdfDoc = newDoc;
    return this.pdfDoc;
  }

  /**
   * Export the current document to a byte array
   */
  public async exportBytes(): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error("No document loaded");
    return await this.pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Export the current document as an RC4 encrypted byte array
   */
  public async exportEncryptedBytes(userPassword?: string, ownerPassword?: string): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error("No document loaded");
    
    // First, save the unencrypted bytes with object streams disabled.
    // pdf-encrypt-lite requires object streams to be off to encrypt properly.
    const unencryptedBytes = await this.pdfDoc.save({ useObjectStreams: false });
    
    // Encrypt the bytes
    const encryptedBytes = await encryptPDF(
      unencryptedBytes, 
      userPassword || '', 
      ownerPassword || undefined
    );
    
    return encryptedBytes;
  }
}
