// Pre-bundle the PDF web worker (with @lumvale/pdf-core and its deps inlined)
// into a single self-contained string, written to src/engine/pdfWorker.inline.ts.
//
// Why: @lumvale/pdf-ui ships as a LIBRARY consumed by arbitrary bundlers
// (Vite for the desktop app, Next.js/webpack for embedding hosts). Vite's
// `?worker` import does not survive into the published dist, so instead we inline the
// worker as code and spin it up from a Blob URL at runtime (see workerEngine.ts)
// — fully bundler-agnostic. Run automatically before each build (see package.json).
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const result = await build({
  entryPoints: [resolve(root, 'src/workers/pdf.worker.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  write: false,
  legalComments: 'none',
});

const code = result.outputFiles[0].text;

const out = `/* eslint-disable */
// @ts-nocheck
/**
 * GENERATED FILE — do not edit by hand.
 * Self-contained bundle of src/workers/pdf.worker.ts (pdf-core inlined),
 * run as a Blob worker by ../engine/workerEngine.ts. Regenerate with:
 *   node scripts/build-worker.mjs   (runs automatically on build:worker/build/build:lib)
 */
export const PDF_WORKER_CODE = ${JSON.stringify(code)};
`;

writeFileSync(resolve(root, 'src/engine/pdfWorker.inline.ts'), out);
console.log(`[build-worker] wrote src/engine/pdfWorker.inline.ts (${(code.length / 1024).toFixed(1)} KB)`);
