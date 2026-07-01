import { PDFDocument, degrees, rgb, PDFName, PDFDict, PDFArray, PDFNumber, PDFString, PDFHexString, StandardFonts } from 'pdf-lib';
// Vendored, permission-aware fork of @pdfsmaller/pdf-encrypt-lite (MIT). The
// published package hardcodes the permission integer; see vendor/pdf-encrypt.
import { encryptPDF } from './vendor/pdf-encrypt/pdf-encrypt.js';

/**
 * Granular document permissions for {@link LumvalePDFEngine.exportEncryptedBytes}.
 * Each flag defaults to allowed (true); set one to `false` to deny it.
 *
 * Permissions are only enforced by conformant readers when a distinct owner
 * password is set — see {@link computePermissions} and `exportEncryptedBytes`.
 */
export interface PdfPermissions {
  /** Allow printing (and, implicitly, high-resolution printing). */
  printing?: boolean;
  /** Allow modifying the document's contents. */
  modifying?: boolean;
  /** Allow copying / extracting text and graphics. */
  copying?: boolean;
  /** Allow adding or modifying annotations and form fields. */
  annotating?: boolean;
  /** Allow filling in existing form fields. */
  fillingForms?: boolean;
  /** Allow extracting text/graphics for accessibility. */
  contentAccessibility?: boolean;
  /** Allow assembling the document (insert/delete/rotate pages). */
  documentAssembly?: boolean;
}

/**
 * Compute the signed 32-bit `/P` permission value (PDF 32000-1, Table 22,
 * security handler revision ≥3) from a {@link PdfPermissions} object. Starts from
 * 0xFFFFFFFC ("all allowed", reserved bits 1–2 cleared) and clears the bit for
 * each denied capability. `computePermissions({})` returns -4 (unchanged default).
 */
export function computePermissions(p: PdfPermissions = {}): number {
  let bits = 0xFFFFFFFC;
  const deny = (mask: number) => { bits &= ~mask; };
  if (p.printing === false)             deny(0x4 | 0x800); // bit 3 (print) + bit 12 (high-res)
  if (p.modifying === false)            deny(0x8);         // bit 4
  if (p.copying === false)              deny(0x10);        // bit 5
  if (p.annotating === false)           deny(0x20);        // bit 6
  if (p.fillingForms === false)         deny(0x100);       // bit 9
  if (p.contentAccessibility === false) deny(0x200);       // bit 10
  if (p.documentAssembly === false)     deny(0x400);       // bit 11
  return bits | 0; // force signed 32-bit
}

/** True when every permission flag is allowed (or unset). */
function allPermissionsAllowed(p?: PdfPermissions): boolean {
  return computePermissions(p) === (0xFFFFFFFC | 0);
}

// Document-conversion port + registry. The contract lives in core; the
// environment-specific adapters live in platform packages and are registered by
// the app at its composition root. See docs/adr/0001-package-architecture.md.
export {
  ConverterRegistry,
  ConversionError,
  type ConversionInput,
  type DocumentConverter,
} from './conversion';

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
  public async addWatermark(options: { 
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
    
    const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const index of indicesToWatermark) {
      if (index >= 0 && index < pages.length) {
        const page = pages[index];
        const { width, height } = page.getSize();
        
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        
        page.drawText(text, {
          x: width / 2 - textWidth / 2,
          y: height / 2 - fontSize / 2,
          size: fontSize,
          font: font,
          color: rgb(r, g, b),
          opacity: opacity,
          rotate: degrees(angle),
        });
      }
    }
  }

  /**
   * Add Bates Numbering to specific pages or all pages.
   */
  public async addBatesNumbering(options: { 
    prefix?: string,
    suffix?: string,
    startNumber: number,
    numberOfDigits: number,
    fontSize: number, 
    colorHex: string, 
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
    marginX?: number,
    marginY?: number,
    pageIndices?: number[] 
  }) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const { prefix = "", suffix = "", startNumber, numberOfDigits, fontSize, colorHex, position = 'bottom-right', marginX = 30, marginY = 30, pageIndices } = options;
    
    // Parse hex color
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;
    
    const pages = this.pdfDoc.getPages();
    const indicesToBates = pageIndices || pages.map((_, i) => i);
    
    const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);

    let currentNumber = startNumber;

    for (const index of indicesToBates) {
      if (index >= 0 && index < pages.length) {
        const page = pages[index];
        const numStr = String(currentNumber).padStart(numberOfDigits, '0');
        const text = `${prefix}${numStr}${suffix}`;
        
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        
        let drawX = marginX;
        let drawY = marginY;

        if (position === 'bottom-left') {
          drawX = marginX;
          drawY = marginY;
        } else if (position === 'bottom-center') {
          drawX = (width / 2) - (textWidth / 2);
          drawY = marginY;
        } else if (position === 'bottom-right') {
          drawX = width - marginX - textWidth;
          drawY = marginY;
        } else if (position === 'top-left') {
          drawX = marginX;
          drawY = height - marginY - fontSize;
        } else if (position === 'top-center') {
          drawX = (width / 2) - (textWidth / 2);
          drawY = height - marginY - fontSize;
        } else if (position === 'top-right') {
          drawX = width - marginX - textWidth;
          drawY = height - marginY - fontSize;
        }
        
        page.drawText(text, {
          x: drawX,
          y: drawY,
          size: fontSize,
          font: font,
          color: rgb(r, g, b),
        });
        currentNumber++;
      }
    }
  }

  /**
   * Add headers and footers with dynamic tokens.
   */
  public async addHeadersFooters(options: {
    headerLeft?: string;
    headerCenter?: string;
    headerRight?: string;
    footerLeft?: string;
    footerCenter?: string;
    footerRight?: string;
    fontSize: number;
    colorHex: string;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    pageIndices?: number[];
  }) {
    if (!this.pdfDoc) throw new Error("No document loaded");
    const { 
      headerLeft = '', headerCenter = '', headerRight = '', 
      footerLeft = '', footerCenter = '', footerRight = '', 
      fontSize, colorHex, 
      marginTop = 30, marginBottom = 30, marginLeft = 30, marginRight = 30, 
      pageIndices 
    } = options;
    
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;
    
    const pages = this.pdfDoc.getPages();
    const indicesToApply = pageIndices || pages.map((_, i) => i);
    const totalPages = pages.length;
    
    const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);

    const replaceTokens = (text: string, pageNum: number, total: number) => {
      const now = new Date();
      return text
        .replace(/{pageNumber}/g, String(pageNum))
        .replace(/{totalPages}/g, String(total))
        .replace(/{date}/g, now.toLocaleDateString());
    };

    for (const index of indicesToApply) {
      if (index >= 0 && index < totalPages) {
        const page = pages[index];
        const { width, height } = page.getSize();
        const pageNumber = index + 1;
        
        const drawOpts = {
          size: fontSize,
          font: font,
          color: rgb(r, g, b),
        };

        if (headerLeft) {
          page.drawText(replaceTokens(headerLeft, pageNumber, totalPages), {
            ...drawOpts, x: marginLeft, y: height - marginTop
          });
        }
        if (headerCenter) {
          const text = replaceTokens(headerCenter, pageNumber, totalPages);
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          page.drawText(text, {
            ...drawOpts, x: (width / 2) - (textWidth / 2), y: height - marginTop
          });
        }
        if (headerRight) {
          const text = replaceTokens(headerRight, pageNumber, totalPages);
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          page.drawText(text, {
            ...drawOpts, x: width - marginRight - textWidth, y: height - marginTop
          });
        }

        if (footerLeft) {
          page.drawText(replaceTokens(footerLeft, pageNumber, totalPages), {
            ...drawOpts, x: marginLeft, y: marginBottom
          });
        }
        if (footerCenter) {
          const text = replaceTokens(footerCenter, pageNumber, totalPages);
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          page.drawText(text, {
            ...drawOpts, x: (width / 2) - (textWidth / 2), y: marginBottom
          });
        }
        if (footerRight) {
          const text = replaceTokens(footerRight, pageNumber, totalPages);
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          page.drawText(text, {
            ...drawOpts, x: width - marginRight - textWidth, y: marginBottom
          });
        }
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
        // Stroke each freehand path as connected line segments. (pdf-lib's
        // drawSvgPath with only borderColor renders nothing in this version, so
        // flattened ink used to disappear silently.) Coordinates arrive in
        // top-left-origin screen space, so flip y into PDF's bottom-left origin.
        for (const pts of ann.paths) {
          for (let i = 1; i < pts.length; i++) {
            page.drawLine({
              start: { x: pts[i - 1].x, y: height - pts[i - 1].y },
              end: { x: pts[i].x, y: height - pts[i].y },
              thickness: ann.strokeWidth,
              color: rgb(r, g, b),
            });
          }
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
      } else if (ann.type === 'circle') {
        for (const rect of ann.rects) {
          // Ellipse inscribed in the drawn box. Coordinates arrive top-left
          // origin; flip the centre into PDF's bottom-left origin.
          page.drawEllipse({
            x: rect.x + rect.width / 2,
            y: height - (rect.y + rect.height / 2),
            xScale: Math.abs(rect.width / 2),
            yScale: Math.abs(rect.height / 2),
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
    
    // Ensure the page has an Annots array. Note: lookup(key, PDFArray) THROWS
    // when the key is missing (it type-checks undefined), so look it up untyped
    // and create the array when it isn't already one.
    const existingAnnots = page.node.lookup(PDFName.of('Annots'));
    let annots: PDFArray;
    if (existingAnnots instanceof PDFArray) {
      annots = existingAnnots;
    } else {
      annots = this.pdfDoc.context.obj([]) as PDFArray;
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
      } else if (ann.type === 'circle') {
        for (const rbox of ann.rects) {
          const rx = rbox.x;
          const ry = height - rbox.y - rbox.height;
          const rect = this.pdfDoc.context.obj([rx, ry, rx + rbox.width, ry + rbox.height]);

          const annotDict = this.pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Circle',
            Rect: rect,
            C: colorArr,
            BS: this.pdfDoc.context.obj({ W: ann.strokeWidth || 2 }),
            F: 4,
          });

          annots.push(this.pdfDoc.context.register(annotDict));
        }
      } else if (ann.type === 'image') {
        // Images have no simple editable-annotation form (they'd need a Stamp
        // annotation with an image appearance stream), so bake them into the
        // page even in "native" mode — the practical, viewer-portable behaviour.
        const imageBytes = Uint8Array.from(atob(ann.dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
        const pdfImage = ann.dataUrl.startsWith('data:image/png')
          ? await this.pdfDoc.embedPng(imageBytes)
          : await this.pdfDoc.embedJpg(imageBytes);
        page.drawImage(pdfImage, {
          x: ann.x,
          y: height - ann.y - ann.height,
          width: ann.width,
          height: ann.height,
        });
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
    // parseSpeed: Infinity prevents yielding during load
    this.pdfDoc = await PDFDocument.load(bytes, { parseSpeed: Infinity });
    return this.pdfDoc;
  }

  /**
   * Merge another PDF document into the current one
   */
  public async mergeWith(otherBytes: Uint8Array) {
    if (!this.pdfDoc) throw new Error("No primary document loaded");
    const otherDoc = await PDFDocument.load(otherBytes, { parseSpeed: Infinity });
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
        sourceDoc = await PDFDocument.load(item.docBytes, { parseSpeed: Infinity });
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
   * Serializes the document back into a byte array.
   */
  public async exportBytes(): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error("No document loaded");
    return await this.pdfDoc.save({ useObjectStreams: false, objectsPerTick: Infinity });
  }

  /**
   * Export the current document as an RC4 (128-bit) encrypted byte array.
   *
   * @param userPassword  Password to open the document (omit for no open password).
   * @param ownerPassword Owner password. Required — and must differ from the user
   *                      password — whenever `permissions` restricts anything, since
   *                      readers only enforce `/P` for the user (not the owner).
   * @param permissions   Optional granular permissions. Defaults to all allowed.
   */
  public async exportEncryptedBytes(
    userPassword?: string,
    ownerPassword?: string,
    permissions?: PdfPermissions,
  ): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error("No document loaded");

    // Restricting permissions is only meaningful with a distinct owner password.
    if (!allPermissionsAllowed(permissions)) {
      if (!ownerPassword || ownerPassword === (userPassword || '')) {
        throw new Error("Restricting permissions requires a distinct owner password");
      }
    }

    // Save the unencrypted bytes with object streams disabled — the encrypt
    // routine requires object streams to be off to encrypt properly.
    const unencryptedBytes = await this.pdfDoc.save({ useObjectStreams: false, objectsPerTick: Infinity });

    const encryptedBytes = await encryptPDF(
      unencryptedBytes,
      userPassword || '',
      ownerPassword || undefined,
      computePermissions(permissions),
    );

    return encryptedBytes;
  }
}
