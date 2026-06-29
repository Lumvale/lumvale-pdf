import { useEffect, useRef, useState } from 'react';
import { rulerTicks } from '../utils/viewAids';

interface ViewAidsProps {
  showRuler?: boolean;
  showGrid?: boolean;
  /** Pixels between minor ruler ticks / grid lines. */
  step?: number;
}

/** Thickness of the ruler strips, in px. */
const RULER_SIZE = 18;

/**
 * A non-interactive overlay drawing optional ruler guides and a grid over the
 * viewer. It pins to the visible viewport (so it should be placed as an absolute
 * sibling of the scroll container, not inside the scrolled content) and measures
 * itself, so callers only pass the toggles. Tick geometry comes from the pure
 * {@link rulerTicks} helper.
 */
export default function ViewAids({ showRuler = false, showGrid = false, step = 25 }: ViewAidsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    // Guard for environments without ResizeObserver (jsdom tests, SSR, old browsers).
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hTicks = showRuler ? rulerTicks(size.w, step) : [];
  const vTicks = showRuler ? rulerTicks(size.h, step) : [];

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {showGrid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-lumvale-border) 1px, transparent 1px),' +
              'linear-gradient(to bottom, var(--color-lumvale-border) 1px, transparent 1px)',
            backgroundSize: `${step}px ${step}px`,
            opacity: 0.4,
          }}
        />
      )}

      {showRuler && (
        <>
          <div
            className="absolute left-0 top-0 bg-[var(--color-lumvale-surface)] border-r border-b border-[var(--color-lumvale-border)]"
            style={{ width: RULER_SIZE, height: RULER_SIZE }}
          />
          {/* Top (horizontal) ruler */}
          <div
            className="absolute top-0 bg-[var(--color-lumvale-surface)] border-b border-[var(--color-lumvale-border)] text-[8px] leading-none text-[var(--color-lumvale-muted)]"
            style={{ left: RULER_SIZE, right: 0, height: RULER_SIZE }}
          >
            {hTicks.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 border-l border-[var(--color-lumvale-border)]"
                style={{ left: t.pos, height: t.major ? RULER_SIZE : RULER_SIZE / 2 }}
              >
                {t.major && t.label ? <span className="absolute left-0.5 top-0">{t.label}</span> : null}
              </div>
            ))}
          </div>
          {/* Left (vertical) ruler */}
          <div
            className="absolute left-0 bg-[var(--color-lumvale-surface)] border-r border-[var(--color-lumvale-border)] text-[8px] leading-none text-[var(--color-lumvale-muted)]"
            style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
          >
            {vTicks.map((t, i) => (
              <div
                key={i}
                className="absolute left-0 border-t border-[var(--color-lumvale-border)]"
                style={{ top: t.pos, width: t.major ? RULER_SIZE : RULER_SIZE / 2 }}
              >
                {t.major && t.label ? (
                  <span className="absolute left-0 top-0" style={{ writingMode: 'vertical-rl' }}>{t.label}</span>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
