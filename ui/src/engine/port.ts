/**
 * DocumentEngine — the port for PDF/document manipulation.
 *
 * A small, engine-agnostic interface that the workspace UI drives. The default
 * implementation wraps @lumvale/pdf-core (see ./pdfCoreEngine); a host that
 * needs different behavior — e.g. a server-backed engine — can supply its own
 * adapter by implementing this same interface.
 *
 * Bytes-in / bytes-out: every operation takes the current document bytes and
 * resolves to new bytes, leaving the input untouched. Page indices are
 * zero-based unless noted. Option shapes carry an index signature so the adapter
 * can pass engine-specific fields through without breaking the type.
 */

/** Document metadata read from / written to a document. */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

export interface WatermarkOptions {
  text: string;
  opacity?: number;
  fontSize?: number;
  /** Degrees, counter-clockwise. */
  rotation?: number;
  color?: string;
  [key: string]: unknown;
}

export interface BatesOptions {
  prefix?: string;
  suffix?: string;
  startNumber?: number;
  /** Zero-pad the number to this many digits. */
  digits?: number;
  [key: string]: unknown;
}

export interface HeaderFooterOptions {
  headerText?: string;
  footerText?: string;
  [key: string]: unknown;
}

export interface EncryptOptions {
  userPassword?: string;
  ownerPassword?: string;
}

/** A page taken from a specific source document, used when composing/merging. */
export interface PageSource {
  /** The document the page comes from. */
  documentBytes: Uint8Array;
  /** Zero-based page index within that document. */
  pageIndex: number;
}

/**
 * All operations take the current document bytes and resolve to new bytes,
 * leaving the input untouched. Page indices are zero-based unless noted.
 */
export interface DocumentEngine {
  /** Number of pages in the document. */
  getPageCount(documentBytes: Uint8Array): Promise<number>;

  getMetadata(documentBytes: Uint8Array): Promise<DocumentMetadata>;
  setMetadata(documentBytes: Uint8Array, metadata: DocumentMetadata): Promise<Uint8Array>;

  addWatermark(documentBytes: Uint8Array, options: WatermarkOptions): Promise<Uint8Array>;
  addBatesNumbering(documentBytes: Uint8Array, options: BatesOptions): Promise<Uint8Array>;
  addHeadersFooters(documentBytes: Uint8Array, options: HeaderFooterOptions): Promise<Uint8Array>;

  compress(documentBytes: Uint8Array): Promise<Uint8Array>;
  encrypt(documentBytes: Uint8Array, options: EncryptOptions): Promise<Uint8Array>;

  rotatePage(documentBytes: Uint8Array, pageIndex: number, degrees: number): Promise<Uint8Array>;
  /** Return a new document containing only the given pages, in the given order. */
  extractPages(documentBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array>;
  /** Compose a new document from an ordered sequence of pages across sources. */
  buildFromSequence(sequence: PageSource[]): Promise<Uint8Array>;
}
