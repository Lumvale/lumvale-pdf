/**
 * Document conversion — the PORT (and an in-process registry).
 *
 * `core` defines the *contract* for turning a non-PDF document into PDF bytes,
 * but never the heavy, environment-specific *implementation*. Adapters live in
 * platform packages (e.g. a browser adapter using docx-preview, or a headless
 * Node adapter) and are registered into a {@link ConverterRegistry} at the
 * application's composition root. This keeps `core` pure and runnable in any JS
 * runtime while letting each deployment decide how conversion actually happens.
 *
 * See docs/adr/0001-package-architecture.md.
 */

/** A document to convert, plus hints used to route it to a converter. */
export interface ConversionInput {
  /** Raw bytes of the source document. */
  bytes: Uint8Array;
  /** Original file name, used for extension-based routing (e.g. "report.docx"). */
  fileName?: string;
  /** MIME type, if known. */
  mimeType?: string;
}

/** A backend that converts a document to PDF. Implemented by platform adapters. */
export interface DocumentConverter {
  /** Stable identifier, for diagnostics (e.g. "browser-docx-preview"). */
  readonly id: string;
  /** Whether this converter can handle the given input. */
  canConvert(input: ConversionInput): boolean;
  /** Convert the input to PDF bytes. Rejects if conversion fails. */
  toPdf(input: ConversionInput): Promise<Uint8Array>;
}

/** Raised when no registered converter can handle an input, or conversion fails. */
export class ConversionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ConversionError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * Holds the converters an application has registered and routes an input to the
 * first one that can handle it. Converters are tried in registration order, so
 * register the more specific / preferred adapter first.
 *
 * Apps own the wiring: create a registry at startup and register the adapter(s)
 * appropriate for the runtime (browser DOM, headless, etc.). `core` provides no
 * global singleton on purpose — explicit wiring keeps it testable and avoids
 * shared mutable state across server/client boundaries.
 */
export class ConverterRegistry {
  private readonly converters: DocumentConverter[] = [];

  /** Register a converter. Returns `this` for chaining. */
  register(converter: DocumentConverter): this {
    this.converters.push(converter);
    return this;
  }

  /** All registered converters, in registration order. */
  list(): readonly DocumentConverter[] {
    return this.converters;
  }

  /** The first converter that can handle `input`, or `null` if none. */
  find(input: ConversionInput): DocumentConverter | null {
    return this.converters.find((c) => c.canConvert(input)) ?? null;
  }

  /** Whether any registered converter can handle `input`. */
  canConvert(input: ConversionInput): boolean {
    return this.find(input) !== null;
  }

  /** Convert `input` to PDF using the first capable converter. */
  async toPdf(input: ConversionInput): Promise<Uint8Array> {
    const converter = this.find(input);
    if (!converter) {
      throw new ConversionError(`No converter registered for ${describeInput(input)}`);
    }
    try {
      return await converter.toPdf(input);
    } catch (cause) {
      throw new ConversionError(
        `Converter "${converter.id}" failed for ${describeInput(input)}`,
        { cause }
      );
    }
  }
}

function describeInput(input: ConversionInput): string {
  return input.fileName ?? input.mimeType ?? `${input.bytes.byteLength} bytes`;
}
