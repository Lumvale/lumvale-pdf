/**
 * Parses a human-entered page selection like `"1, 3, 5-7"` into a sorted,
 * de-duplicated list of **1-based** page numbers, clamped to `[1, pageCount]`.
 *
 * - `"all"` (case-insensitive, whitespace-trimmed) returns every page.
 * - Reversed ranges (`"7-5"`) are accepted and normalised.
 * - Out-of-range and non-numeric tokens are ignored.
 * - Returns `null` when the input names no valid pages, so callers can show a
 *   validation message rather than silently selecting nothing.
 */
export function parsePageRanges(input: string, pageCount: number): number[] | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (trimmed.toLowerCase() === 'all') {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  for (let part of trimmed.split(',')) {
    part = part.trim();
    if (!part) continue;
    if (part.includes('-')) {
      const [a, b] = part.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1 && i <= pageCount) pages.add(i);
        }
      }
    } else {
      const n = parseInt(part, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= pageCount) pages.add(n);
    }
  }

  return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
}
