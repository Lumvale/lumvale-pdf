import { describe, it, expect } from 'vitest';
import { pageOffsets } from './conversion';

// The DOM-based conversions need a real browser and are covered by the consuming
// app's e2e tests; here we lock down the pure page-slicing math that decides how
// a tall document image is tiled across pages (the source of the previous
// overlapping/chopped-text bug).
describe('pageOffsets', () => {
  it('returns a single page when content fits within one page', () => {
    expect(pageOffsets(500, 1122)).toEqual([0]);
    expect(pageOffsets(1122, 1122)).toEqual([0]);
  });

  it('shifts each page up by exactly one page height', () => {
    expect(pageOffsets(2000, 1000)).toEqual([0, -1000]);
    expect(pageOffsets(2500, 1000)).toEqual([0, -1000, -2000]);
  });

  it('does not emit a trailing near-empty page (1px epsilon)', () => {
    // Exactly two pages tall — must not produce a third blank page.
    expect(pageOffsets(2000, 1000)).toHaveLength(2);
    // 1px over a clean multiple still counts as two pages, not three.
    expect(pageOffsets(2001, 1000)).toHaveLength(2);
    // Meaningfully past the boundary spills onto a third page.
    expect(pageOffsets(2002, 1000)).toHaveLength(3);
  });

  it('is defensive against degenerate input', () => {
    expect(pageOffsets(0, 1000)).toEqual([0]);
    expect(pageOffsets(1000, 0)).toEqual([0]);
    expect(pageOffsets(-5, 1000)).toEqual([0]);
  });
});
