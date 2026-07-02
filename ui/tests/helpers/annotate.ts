import { expect, type Page } from '@playwright/test';

/**
 * Annotation helpers. The toolbar exposes four tools: Pen (ink), Highlighter,
 * Text, and Redact. (rectangle/circle/image types exist in the engine but have
 * no toolbar entry — see the test plan.) These helpers assume the workspace is
 * already in Edit Mode with a document open.
 */
export type AnnotationTool =
  | 'Pen Tool'
  | 'Highlighter'
  | 'Text Tool'
  | 'Redact Tool'
  | 'Rectangle Tool'
  | 'Circle Tool';

/** Open the annotation toolbar and select a tool by its button title. */
export async function selectTool(page: Page, tool: AnnotationTool) {
  await page.getByTitle('Annotate Document').click();
  await expect(page.getByTitle(tool)).toBeVisible();
  await page.getByTitle(tool).click();
  await expect(page.getByTestId('annotation-svg')).toBeVisible();
}

/** Open the annotation toolbar and insert an image via the hidden file input. */
export async function insertImage(page: Page, imagePath: string) {
  await page.getByTitle('Annotate Document').click();
  await expect(page.getByTitle('Insert Image')).toBeVisible();
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles(imagePath);
}

/** Drag a stroke/rect within the visible viewport band (canvas is taller than it). */
export async function dragOnPage(
  page: Page,
  opts: { fromXPct?: number; fromY?: number; toXPct?: number; toY?: number } = {}
) {
  const box = await page.getByTestId('annotation-svg').boundingBox();
  if (!box) throw new Error('annotation overlay not found');
  const fromX = box.x + box.width * (opts.fromXPct ?? 0.3);
  const fromY = box.y + (opts.fromY ?? 90);
  const toX = box.x + box.width * (opts.toXPct ?? 0.6);
  const toY = box.y + (opts.toY ?? 320);
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 8 });
  await page.mouse.up();
}

/**
 * Place a text annotation: click to drop the input, fill it, and commit via the
 * "Save Text" button (deterministic — no reliance on focus for keystrokes).
 */
export async function placeText(page: Page, text: string, opts: { xPct?: number; y?: number } = {}) {
  const box = await page.getByTestId('annotation-svg').boundingBox();
  if (!box) throw new Error('annotation overlay not found');
  await page.mouse.click(box.x + box.width * (opts.xPct ?? 0.3), box.y + (opts.y ?? 140));
  const input = page.locator('input[type="text"]').last();
  await expect(input).toBeVisible();
  await input.fill(text);
  // Commit with Enter on the input — the overlay SVG stretches over the inline
  // "Save Text" button and intercepts pointer events, so clicking it hangs.
  await input.press('Enter');
}

/** Count pixels in the page canvas matching a coarse colour predicate. */
export async function countPixels(
  page: Page,
  match: 'red' | 'black' | 'nonwhite'
): Promise<number> {
  return page.locator('#pdf-page-1 canvas').first().evaluate((el, kind) => {
    const c = el as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx) return 0;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (kind === 'red' && r > 180 && g < 120 && b < 120) n++;
      else if (kind === 'black' && r < 60 && g < 60 && b < 60) n++;
      else if (kind === 'nonwhite' && (r < 235 || g < 235 || b < 235)) n++;
    }
    return n;
  }, match);
}
