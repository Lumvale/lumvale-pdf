#!/usr/bin/env node
// Open-core boundary check for the OSS lumvale-pdf repo.
// Fails if any package.json depends on a non-OSS Lumvale package, or any source
// file imports one. The repo's own workspace packages are allowed (self-refs).
// See Engineering/Architecture/oss-and-ip-isolation.md.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'dist-electron', '.git', 'build', 'coverage',
  'test-results', 'playwright-report', 'out',
]);
const COMMERCIAL_HINTS = ['secure', 'connect', 'graph', 'intelligence', 'omnia',
  'workspace-contracts', 'workspace-ui'];

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
  for (const name of entries) {
    const p = join(dir, name);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) { if (!IGNORE_DIRS.has(name)) walk(p, files); }
    else files.push(p);
  }
  return files;
}

const allFiles = walk(ROOT);
const pkgFiles = allFiles.filter((f) => f.endsWith('package.json'));

// The monorepo's own workspace package names are allowed (self-references).
const selfNames = new Set();
for (const f of pkgFiles) {
  try { const j = JSON.parse(readFileSync(f, 'utf8')); if (j.name) selfNames.add(j.name); } catch {}
}

const isForeignLumvale = (name) =>
  (name.startsWith('@lumvale/') || name.startsWith('lumvale-')) && !selfNames.has(name);

const violations = [];

// 1) dependency fields
for (const f of pkgFiles) {
  let j; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, ver] of Object.entries(j[field] || {})) {
      if (isForeignLumvale(name)) {
        violations.push(`${f}: dependency "${name}" is a non-OSS Lumvale package`);
      }
      if (typeof ver === 'string' && /github\.com[:/]+Lumvale\//i.test(ver) && !/lumvale-pdf/i.test(ver)) {
        violations.push(`${f}: dependency "${name}" points at a Lumvale repo other than lumvale-pdf ("${ver}")`);
      }
    }
  }
}

// 2) source imports
const SRC_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IMPORT_RE = /(?:from\s+|require\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
for (const f of allFiles) {
  const ext = f.slice(f.lastIndexOf('.'));
  if (!SRC_EXTS.has(ext) || f.endsWith('.d.ts')) continue;
  let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
  let m;
  while ((m = IMPORT_RE.exec(text))) {
    const mod = m[1];
    if (isForeignLumvale(mod) ||
        (mod.startsWith('@lumvale/') && COMMERCIAL_HINTS.some((h) => mod.includes(h)))) {
      violations.push(`${f}: imports non-OSS module "${mod}"`);
    }
  }
}

if (violations.length) {
  console.error('OSS open-core boundary violations:\n');
  for (const v of violations) console.error('  - ' + v);
  console.error(`\n${violations.length} violation(s). Commercial code/deps must not enter the OSS repo` +
    ' (see Engineering/Architecture/oss-and-ip-isolation.md).');
  process.exit(1);
}
console.log('OSS open-core boundary OK: no private/commercial Lumvale deps or imports found.');
