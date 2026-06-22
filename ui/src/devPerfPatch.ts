// IMPORTANT: this module must be imported before react-dom (see main.tsx).
//
// React 19's *development* build records a `performance.measure()` for every
// component render (the "⚛ Components" performance track) and passes the
// component's props as the measure detail. Our page canvases receive the
// multi-megabyte `documentBytes` as a prop, so across the ~100+ canvases of a
// large document React structured-clones hundreds of MB into the user-timing
// buffer on each re-render. That throws `DataCloneError: ... out of memory`,
// which corrupts React's work loop ("Should not already be working") and freezes
// the dev build for minutes after any edit.
//
// Production React has no such instrumentation (which is why the packaged app is
// fast), so we neutralize it in dev only.
//
// React decides whether to record these timings with a one-time check at module
// load: `typeof performance.measure === 'function'`. By making `performance.mark`
// / `performance.measure` undefined *before* react-dom is imported, that check is
// false, so React skips the whole instrumentation — including building the props
// "detail" (which is what actually clones the megabytes). A no-op function isn't
// enough: React would still build the detail and only the final call would be
// cheap. We then restore the real functions on the next microtask, after
// react-dom has captured its decision, so any other caller still works.
if (import.meta.env.DEV && typeof performance !== 'undefined') {
  try {
    const realMark = performance.mark;
    const realMeasure = performance.measure;
    const disabled = undefined as unknown as Performance['mark'];
    performance.mark = disabled;
    performance.measure = disabled as unknown as Performance['measure'];
    queueMicrotask(() => {
      performance.mark = realMark;
      performance.measure = realMeasure;
    });
  } catch {
    /* read-only in some environments; ignore */
  }
}
