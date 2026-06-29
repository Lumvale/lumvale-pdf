import { describe, it, expect } from 'vitest';
import { pagePairs, rulerTicks } from './viewAids';

describe('pagePairs', () => {
  it('groups pages into rows of two', () => {
    expect(pagePairs([1, 2, 3, 4])).toEqual([[1, 2], [3, 4]]);
  });

  it('leaves a trailing single page in its own row', () => {
    expect(pagePairs([1, 2, 3])).toEqual([[1, 2], [3]]);
  });

  it('handles an empty list', () => {
    expect(pagePairs([])).toEqual([]);
  });
});

describe('rulerTicks', () => {
  it('places a tick every step and labels majors with the pixel distance', () => {
    const ticks = rulerTicks(20, 10, 2); // positions 0,10,20; majorEvery=2
    expect(ticks.map((t) => t.pos)).toEqual([0, 10, 20]);
    expect(ticks.map((t) => t.major)).toEqual([true, false, true]);
    expect(ticks[0].label).toBe('0');
    expect(ticks[2].label).toBe('20');
    expect(ticks[1].label).toBeUndefined();
  });

  it('returns nothing for non-positive inputs', () => {
    expect(rulerTicks(0, 10)).toEqual([]);
    expect(rulerTicks(100, 0)).toEqual([]);
    expect(rulerTicks(100, 10, 0)).toEqual([]);
  });

  it('rounds fractional positions in major labels', () => {
    const ticks = rulerTicks(15, 7.5, 1); // 0, 7.5, 15 — all major
    expect(ticks.map((t) => t.label)).toEqual(['0', '8', '15']);
  });
});
