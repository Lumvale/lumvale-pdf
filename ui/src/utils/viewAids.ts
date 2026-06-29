/**
 * Pure helpers for the viewer aids: dual-page (side-by-side) layout and the
 * ruler/grid guides. Kept separate from the React components so the geometry is
 * unit-testable and reusable.
 */

/** Group a page list into rows of up to two, for the dual-page (book) layout. */
export function pagePairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export interface RulerTick {
  /** Offset from the ruler's origin, in pixels. */
  pos: number;
  /** Major ticks are longer and labelled; minor ticks are short and unlabelled. */
  major: boolean;
  /** Present on major ticks only: the pixel distance, as a string. */
  label?: string;
}

/**
 * Tick marks for a ruler `length` px long, one every `step` px, with every
 * `majorEvery`-th tick promoted to a labelled major tick. Returns an empty list
 * for non-positive inputs so a zero-sized viewport renders no ruler.
 */
export function rulerTicks(length: number, step: number, majorEvery = 5): RulerTick[] {
  if (step <= 0 || length <= 0 || majorEvery <= 0) return [];
  const ticks: RulerTick[] = [];
  let index = 0;
  for (let pos = 0; pos <= length; pos += step, index++) {
    const major = index % majorEvery === 0;
    ticks.push(major ? { pos, major, label: String(Math.round(pos)) } : { pos, major });
  }
  return ticks;
}
