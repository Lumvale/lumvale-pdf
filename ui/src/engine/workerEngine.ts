import type { DocumentEngine } from './port';
import { createPdfCoreEngine } from './pdfCoreEngine';
import { PDF_WORKER_CODE } from './pdfWorker.inline';

/**
 * Worker-backed DocumentEngine for OSS @lumvale/pdf-ui.
 *
 * The page-heavy operations (watermark, Bates numbering, headers/footers,
 * compress, encrypt) run off the main thread so large PDFs don't freeze the UI.
 * The lighter ops (page count, metadata, rotate, extract, compose) stay on the
 * main thread via the plain pdf-core adapter — they're cheap and avoid a round
 * trip.
 *
 * The worker is inlined (see scripts/build-worker.mjs) and started from a Blob
 * URL, so this works in any bundler — Vite for the desktop app, Next.js/webpack
 * for embedding hosts — with no separate worker asset to resolve. Creation is
 * lazy and guarded, so importing this module is safe during SSR; if the
 * environment has no Worker support we transparently fall back to running the
 * heavy ops on the main thread.
 */

type WorkerAction = 'watermark' | 'bates' | 'headersFooters' | 'compress' | 'encrypt';

interface PendingJob {
  resolve: (bytes: Uint8Array) => void;
  reject: (err: Error) => void;
}

let sharedWorker: Worker | null = null;
let blobUrl: string | null = null;
const jobs = new Map<string, PendingJob>();

function workerSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined';
}

function getWorker(): Worker {
  if (sharedWorker) return sharedWorker;

  blobUrl = URL.createObjectURL(new Blob([PDF_WORKER_CODE], { type: 'text/javascript' }));
  const worker = new Worker(blobUrl);

  worker.onmessage = (e: MessageEvent) => {
    const { id, success, resultBytes, error, progress } = e.data ?? {};
    if (progress) return; // progress pings — no settle
    const job = jobs.get(id);
    if (!job) return;
    jobs.delete(id);
    if (success) job.resolve(resultBytes as Uint8Array);
    else job.reject(new Error(error || 'Worker operation failed'));
  };

  worker.onerror = () => {
    // A crash (e.g. an oversized/complex doc) rejects every pending job so the
    // UI never hangs; the worker respawns on the next call.
    jobs.forEach((job) => job.reject(new Error('Worker crashed — the document may be too large or complex.')));
    jobs.clear();
    sharedWorker?.terminate();
    sharedWorker = null;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  };

  sharedWorker = worker;
  return worker;
}

function runWorker(action: WorkerAction, payload: Record<string, unknown> & { documentBytes: Uint8Array }): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const id = Math.random().toString(36).slice(2);
    jobs.set(id, { resolve, reject });

    // Clone the buffer so we can transfer it (cheap) without detaching the
    // caller's bytes, which the workspace still holds in state.
    const clonedBuffer = payload.documentBytes.slice().buffer;
    const newPayload = { ...payload, documentBytes: new Uint8Array(clonedBuffer) };
    worker.postMessage({ id, action, payload: newPayload }, [clonedBuffer]);
  });
}

/**
 * DocumentEngine that offloads heavy ops to an inlined Blob worker, with a
 * transparent main-thread fallback (used during SSR or where Worker is absent).
 */
export function createWorkerPdfEngine(): DocumentEngine {
  const main = createPdfCoreEngine();
  if (!workerSupported()) return main;

  return {
    // Light ops — stay on the main thread.
    getPageCount: main.getPageCount,
    getMetadata: main.getMetadata,
    setMetadata: main.setMetadata,
    rotatePage: main.rotatePage,
    extractPages: main.extractPages,
    buildFromSequence: main.buildFromSequence,

    // Heavy ops — offloaded to the worker.
    addWatermark: (documentBytes, options) => runWorker('watermark', { documentBytes, options }),
    addBatesNumbering: (documentBytes, options) => runWorker('bates', { documentBytes, options }),
    addHeadersFooters: (documentBytes, options) => runWorker('headersFooters', { documentBytes, options }),
    compress: (documentBytes) => runWorker('compress', { documentBytes }),
    encrypt: (documentBytes, options) =>
      runWorker('encrypt', {
        documentBytes,
        userPassword: options.userPassword,
        ownerPassword: options.ownerPassword,
      }),
  };
}
