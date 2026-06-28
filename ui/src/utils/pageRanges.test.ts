import { describe, it, expect } from 'vitest';
import { parsePageRanges } from './pageRanges';

describe('parsePageRanges', () => {
  it('expands "all" to every page', () => {
    expect(parsePageRanges('all', 3)).toEqual([1, 2, 3]);
    expect(parsePageRanges('  ALL ', 2)).toEqual([1, 2]);
  });

  it('parses mixed singles and ranges, sorted and de-duplicated', () => {
    expect(parsePageRanges('5-7, 1, 3', 10)).toEqual([1, 3, 5, 6, 7]);
    expect(parsePageRanges('2, 2, 2', 10)).toEqual([2]);
  });

  it('normalises reversed ranges', () => {
    expect(parsePageRanges('7-5', 10)).toEqual([5, 6, 7]);
  });

  it('clamps out-of-range values to the document bounds', () => {
    expect(parsePageRanges('0, 1, 99', 5)).toEqual([1]);
    expect(parsePageRanges('3-99', 5)).toEqual([3, 4, 5]);
  });

  it('returns null for empty or fully-invalid input', () => {
    expect(parsePageRanges('', 5)).toBeNull();
    expect(parsePageRanges('   ', 5)).toBeNull();
    expect(parsePageRanges('abc, -, 99', 5)).toBeNull();
  });

  it('ignores stray separators but keeps valid tokens', () => {
    expect(parsePageRanges('1,,2,', 5)).toEqual([1, 2]);
  });
});
