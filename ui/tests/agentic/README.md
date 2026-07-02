# Agentic computer-vision release smoke (non-CI)

A **manual, agent-driven** visual pass over the running app: an LLM agent (Claude
Code) drives the browser through the **Playwright MCP** (`browser_*` tools),
screenshots each surface, and *judges* whether it looks and behaves right. It
catches "looks broken" issues no assertion encodes, but is slow and
non-deterministic — so it complements, never replaces, the automated
`visual.spec.ts` / `ocr-render.spec.ts` / e2e layers.

**When to run:** once per release (before tagging / Store submission), and after
any change that touches rendering or layout broadly.

## Prerequisites

```bash
# From ui/ — build once and serve the production bundle.
npm run build
npm run preview   # serves http://localhost:4173
```

Fixtures come from `tests/global-setup.ts` (run any Playwright spec once to
generate them), or use any small PDF.

## Release checklist — the agent walks every row

For each row: perform the action, `browser_take_screenshot`, **look at the image
and confirm the expectation**. Tick the box. Stop and file an issue for anything
blank, misaligned, unreadable, or missing.

### 1. Landing & import
- [ ] Landing page: logo, "Drag & Drop your files here", feature cards, theme orb.
- [ ] Toggle theme on the landing page — clean flip, readable in both modes.
- [ ] Upload a PDF → workspace opens, page 1 rendered (not blank/grey).
- [ ] Upload a `.docx` → converts and renders as PDF.
- [ ] Upload a `.md` → converts and renders as PDF.
- [ ] Recent files row shows previously opened documents.

### 2. Viewer & navigation
- [ ] Sidebar thumbnails render; clicking one navigates; active state tracks scroll.
- [ ] Bookmarks tab lists the outline (use `demo-bookmarked.pdf`); click navigates.
- [ ] Zoom in / out / reset / Fit Width all visibly change the page size.
- [ ] Dual-page, Ruler, Grid toggles each overlay correctly (desktop width only).

### 3. Annotations (all 7 tools — enter Edit Mode → Annotate)
- [ ] Pen: draw a stroke — smooth, correct colour.
- [ ] Highlighter: drag a box — translucent overlay.
- [ ] Text: click, type, Enter — text appears at the click point.
- [ ] Redact: drag — solid black box.
- [ ] Rectangle: drag — outlined box.
- [ ] Circle: drag — outlined ellipse.
- [ ] Insert Image: pick a PNG — appears centred, resizable.
- [ ] Select/move/resize an annotation; Delete removes it; Esc cancels a tool.
- [ ] Colour swatch + stroke-width slider visibly change new annotations.

### 4. Page & document operations (Edit Mode)
- [ ] Extract Pages: select → download.
- [ ] Split: single pages → ZIP download.
- [ ] Merge: add a second PDF → combined page count.
- [ ] Organizer: rotate a page (turns landscape), delete a page, drag to reorder.
- [ ] Compress: completes with success message; document still renders.
- [ ] Metadata: edit author → reopen dialog shows it.
- [ ] Page Numbering: stamp appears in the footer (e.g. `CASE-000100`).
- [ ] Headers & Footers: header text renders top-right.
- [ ] Watermark: rotated stamp appears across the page.
- [ ] Encrypt: downloads `*-protected.pdf`; reopening it shows a graceful error.

### 5. Save & export
- [ ] Save As → Flatten: reopened file shows annotations baked in.
- [ ] Save As → Native: reopened file still shows the annotations.
- [ ] Export to Image: PNG downloads and opens.

### 6. Chrome, shortcuts, responsive
- [ ] Help → About: modal opens, logo loads, version shown.
- [ ] Help → Check for Updates: sensible message (no false "up to date" stub).
- [ ] Ctrl+O opens the picker; Ctrl+S saves; Esc closes modals; Ctrl+/-/0 zooms.
- [ ] `browser_resize` to ~390px: sidebar collapses, viewer aids + desktop tools
      hidden, annotate/zoom/File menu still available (limited-edit contract).
- [ ] Install App button appears after `beforeinstallprompt` (Chromium) and the
      install modal opens.

### 7. Desktop app (run separately via the Electron e2e or manually)
- [ ] App launches; title bar overlay matches the theme.
- [ ] Double-clicking a `.pdf` (file association) opens it directly.
- [ ] Help → About and Check for Updates work in the packaged app.

## Findings protocol

Anything that fails here should, where possible, be turned into a deterministic
assertion in the automated specs — this checklist is the net, not the archive.
