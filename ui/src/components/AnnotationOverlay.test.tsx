import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import AnnotationOverlay, { type Annotation } from './AnnotationOverlay';

// jsdom doesn't implement SVG screen-CTM; stub an identity matrix so the
// overlay's screen→SVG coordinate maths works and we can drive selection.
beforeAll(() => {
  (SVGElement.prototype as unknown as { getScreenCTM: () => DOMMatrix }).getScreenCTM = () =>
    ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) as DOMMatrix;
});

const rect: Annotation = {
  id: 'r1', type: 'rectangle', color: '#ff0000', pageIndex: 0,
  strokeWidth: 2, rects: [{ x: 20, y: 20, width: 40, height: 40 }],
};

function setup(props: Partial<React.ComponentProps<typeof AnnotationOverlay>> = {}) {
  const onAnnotationsChange = vi.fn();
  const onToolSelect = vi.fn();
  const utils = render(
    <AnnotationOverlay
      pageIndex={0}
      scale={1}
      activeTool={null}
      activeColor="#ff0000"
      activeStrokeWidth={2}
      annotations={[rect]}
      onAnnotationsChange={onAnnotationsChange}
      onToolSelect={onToolSelect}
      width={200}
      height={200}
      {...props}
    />,
  );
  return { ...utils, onAnnotationsChange, onToolSelect };
}

const press = (key: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });

describe('AnnotationOverlay — cursor shapes', () => {
  it('shows a crosshair for drawing tools, a caret for text, the arrow otherwise', () => {
    const { getByTestId, rerender } = setup({ activeTool: 'ink' });
    expect(getByTestId('annotation-overlay').style.cursor).toBe('crosshair');

    const common = {
      pageIndex: 0, scale: 1, activeColor: '#ff0000', activeStrokeWidth: 2,
      annotations: [rect], onAnnotationsChange: vi.fn(), width: 200, height: 200,
    };
    rerender(<AnnotationOverlay {...common} activeTool="rectangle" />);
    expect(getByTestId('annotation-overlay').style.cursor).toBe('crosshair');
    rerender(<AnnotationOverlay {...common} activeTool="text" />);
    expect(getByTestId('annotation-overlay').style.cursor).toBe('text');
    rerender(<AnnotationOverlay {...common} activeTool={null} />);
    expect(getByTestId('annotation-overlay').style.cursor).toBe('default');
  });
});

describe('AnnotationOverlay — keyboard behaviour', () => {
  it('Escape cancels the active drawing tool', () => {
    const { onToolSelect } = setup({ activeTool: 'ink' });
    press('Escape');
    expect(onToolSelect).toHaveBeenCalledWith(null);
  });

  it('selecting shows the selection box; Escape clears it', () => {
    const { container } = setup();
    const shape = container.querySelector('rect[stroke="#ff0000"]')!;
    act(() => fireEvent.mouseDown(shape, { clientX: 30, clientY: 30 }));
    // The dashed selection outline appears once selected.
    expect(container.querySelector('rect[stroke="#007AFF"]')).not.toBeNull();
    press('Escape');
    expect(container.querySelector('rect[stroke="#007AFF"]')).toBeNull();
  });

  it('Enter confirms (exits) the selection', () => {
    const { container } = setup();
    act(() => fireEvent.mouseDown(container.querySelector('rect[stroke="#ff0000"]')!, { clientX: 30, clientY: 30 }));
    expect(container.querySelector('rect[stroke="#007AFF"]')).not.toBeNull();
    press('Enter');
    expect(container.querySelector('rect[stroke="#007AFF"]')).toBeNull();
  });

  it('Delete removes the selected annotation', () => {
    const { container, onAnnotationsChange } = setup();
    act(() => fireEvent.mouseDown(container.querySelector('rect[stroke="#ff0000"]')!, { clientX: 30, clientY: 30 }));
    press('Delete');
    expect(onAnnotationsChange).toHaveBeenCalledWith([]);
  });
});
