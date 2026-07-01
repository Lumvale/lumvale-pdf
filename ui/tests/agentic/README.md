# Agentic computer-vision smoke (non-CI)

This is a **manual, agent-driven** visual smoke of the running app. It is
deliberately **not** part of the deterministic CI gate — it uses an LLM agent
(Claude Code) driving the browser through the **Playwright MCP**
(`plugin:playwright:playwright`, tools named `browser_*`) to look at each screen
and judge whether it renders correctly. That judgement is powerful (it catches
"looks broken" issues no assertion encodes) but slow and non-deterministic, so it
complements — never replaces — the automated `visual.spec.ts` / `ocr-render.spec.ts`
layers.

Use it before a release, or when a change touches rendering/layout in a way the
pixel baselines can't fully vouch for.

## Prerequisites

```bash
# From ui/ — build once and serve the production bundle.
npm run build
npm run preview   # serves http://localhost:4173
```

The Playwright MCP must be connected (it is, in this workspace). The agent should
already have the fixtures from `tests/global-setup.ts`; if running standalone,
any small PDF works.

## Flow (agent runs these MCP tools in order)

For each step: perform the action, then `browser_take_screenshot`, then **look at
the screenshot and confirm the described expectation**. Stop and report if any
screen is blank, misaligned, or missing content.

| # | Action (MCP tool) | Visually verify |
|---|---|---|
| 1 | `browser_navigate` → `http://localhost:4173/` | Landing page: "Drag & Drop your files here", clean toolbar, aurora backdrop. |
| 2 | `browser_snapshot` | Accessibility tree lists the uploader + "browse files"; no error boundary text. |
| 3 | Upload a PDF (`browser_file_upload` after clicking "browse files") | Workspace appears: left sidebar with page thumbnails, main canvas shows page 1 rendered (not blank/grey). |
| 4 | Click "Toggle Edit Mode", then "Page Numbering"; set prefix + start; Apply | Modal opens and closes; the Bates stamp (e.g. `CASE-000100`) is visible in the page footer. |
| 5 | Click "Annotate Document" → "Pen Tool"; drag on the page | An ink stroke is drawn on the overlay in the tool colour. |
| 6 | Click "Toggle Theme" | The whole UI flips light/dark cleanly — no unstyled flashes, no unreadable contrast. |
| 7 | Resize to a phone width (`browser_resize` ~390px) | Sidebar collapses; the Dual/Ruler/Grid viewer aids disappear (small-screen layout). |
| 8 | `browser_close` | — |

## Relationship to the automated layers

- **`visual.spec.ts`** pins pixel baselines for the landing (light/dark),
  workspace, and mobile — regression-catching but blind to "is this the right
  thing?".
- **`ocr-render.spec.ts`** proves stamped text (Bates, headers) actually
  rasterizes legibly.
- **This flow** is the human-eye backstop: an agent confirming the app *looks and
  behaves* right across the core journey. Findings here should, where possible, be
  turned into a new assertion in one of the automated specs.
