# ADR 0001 — Package architecture: layered monorepo with a hexagonal core

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Founder (sole maintainer at time of writing)

## Context

LumvalePDF is a monorepo published as npm packages and consumed by multiple
frontends (the Electron desktop app and a separate web SaaS that embeds the
workspace). It is in its initial phase: no external contributors yet, only `@lumvale/pdf-core@1.0.0` and
`@lumvale/pdf-ui@0.1.0` published. This is the cheapest moment to set structure.

Two forces exposed a structural question:

1. **Document conversion** (DOCX/XLSX/PPTX/MD/images → PDF) currently lives as an
   internal helper inside `@lumvale/pdf-ui` (`ui/src/utils/conversion.ts`). It is
   *functionality, not presentation*, so the UI package is the wrong home — but
   it is also **DOM-bound** (`docx-preview` + `html2canvas` render into a live
   DOM), so it cannot move into `core` either.
2. We intend to support **truly headless conversion** in future (e.g. an OS
   right-click "Convert to PDF" handler, which runs in Electron's **main**
   process — Node, no DOM — or a server/CLI). That backend cannot use the
   DOM-based renderer; it needs a different engine.

`@lumvale/pdf-core` is, by design and by its own README, runtime-agnostic — it
must run in "browser tabs, Electron renderers, Node.js backends, and mobile
webviews." It contains zero DOM/`window`/binary references today.

## Decision

Adopt **Clean/Hexagonal Architecture** (Ports & Adapters) across a **layered
monorepo**. Dependencies point inward toward the pure domain and never cycle.

### Packages (dependency arrows point inward → `core`)

| Package | Responsibility | May depend on | Requires at runtime |
|---|---|---|---|
| `@lumvale/pdf-core` | Pure document engine (`pdf-lib` ops) **+ ports** (interfaces like `DocumentConverter`) + dispatch/registry | nothing environmental | nothing — runs anywhere |
| `@lumvale/pdf-browser` | Browser-platform functionality. First resident: DOM conversion (`docx-preview`/`html2canvas`). Future: thumbnailing, canvas/WebGL ops | `core` | a **DOM** (browser / Electron renderer / headless Chromium) |
| `@lumvale/pdf-node` | Node-platform functionality. First resident: headless conversion. Future: filesystem/CLI helpers, native bits | `core` | **Node** APIs / binaries |
| `@lumvale/pdf-ui` | React presentation: components, toolbars, styles, UX | `core`, `pdf-browser` | React in a browser |

Apps (web SaaS, desktop, CLI) are **composition roots**: they import `core` plus
the adapter that fits their runtime and **register it** into core's port. Core
never decides the environment; the edge does.

### Naming rationale

- Packages are named by **platform tier**, not by feature — so a package can host
  more than conversion over time (the tier, not "convert", is the boundary).
- We use **`browser` / `node`** (the required platform), **not** `dom` / `headless`.
  "Headless" is ambiguous: the pure `core` is *also* headless (Node, no GUI), so
  `core-headless` would wrongly read as "core for headless use."
- `pdf-ui` (React components) vs `pdf-browser` (framework-agnostic browser logic):
  presentation vs logic, both in the browser.

### "Where does new code go?" litmus test

1. Needs React / renders UI → **`pdf-ui`**.
2. Needs a live **DOM** (`document`, `canvas`, `html2canvas`) → **`pdf-browser`**.
3. Needs **Node** APIs / a native binary / a child process → **`pdf-node`**.
4. None of the above (pure document logic, an interface/contract) → **`core`**.

### Native, OS-specific binaries (when/if ever)

If a backend ever needs native per-OS binaries (e.g. OS-native converters), do
**not** fork the engine into `*-windows-core` / `*-linux-core`. Follow the
esbuild/`sharp`/`swc` pattern: **one cross-platform package + thin per-`(os,cpu)`
leaf packages** carrying only the binary, declared as `optionalDependencies` with
`os`/`cpu` fields so npm auto-installs the matching one. Consumers install one
package; selection is automatic.

## Consequences

**Positive**
- Conversion becomes first-class functionality and leaves the UI library.
- `core` stays pure and runnable in Node (honors the README contract); a consumer
  who only wants `merge`/`rotate` never installs `html2canvas` or a LibreOffice glue.
- Browser and headless backends are swappable behind one `DocumentConverter` port
  — the desktop right-click and the web uploader call the same core API.
- Structure matches mainstream JS engines (Babel/ESLint/Rollup/Prisma), easing
  future contribution.

**Negative / costs**
- Four packages instead of two → more release coordination (mitigate with npm
  workspaces, already in use; add Changesets when versioning gets busy).
- One-time republish + version bumps across `core`, the new packages, and `ui`.

**Neutral / deferred**
- We build the **seam now** (the port + the browser adapter) but not the headless
  engine until the desktop/server feature actually ships — avoiding a premature
  ~300 MB dependency.

## Open decision — headless conversion engine (defer to Phase 3)

When headless conversion is built, choose among (the port is identical for all):

| Option | Fidelity | Cost | Best when |
|---|---|---|---|
| **Headless Chromium** (Puppeteer / Electron hidden window) | High — reuses the `pdf-browser` pipeline; vector PDF via `page.pdf()` | Needs Chromium (already shipped in Electron) | Desktop right-click; reusing one converter |
| **LibreOffice** (`libreoffice-convert`) | Highest for complex office docs | ~300–400 MB system dep | No Chromium available, or office-grade fidelity needed |
| **pure-JS** (`mammoth` + `pdf-lib`/`pdfmake`) | Lowest (no Node layout engine) | Tiny, zero native deps | Serverless/edge; simple, fidelity-tolerant docs |

### Adapter strategy per deployment (the port makes this pluggable)

Different products register different adapters at their composition root:

- **OSS (`lumvale-pdf`):** ships a **pure-JS** `pdf-node` adapter as the default —
  it `npm install`s and runs literally anywhere (plain Node, serverless, edge),
  no binary. The **Electron desktop** additionally uses a **headless-Chromium
  (hidden window)** adapter, which reuses the high-fidelity `pdf-browser`
  pipeline at zero extra dependency (Chromium already ships in Electron). So OSS
  is not limited to low fidelity: plain-Node consumers get pure-JS; the desktop
  gets Chromium-grade output for free.
- **Downstream consumers** (including proprietary/commercial products) may
  register their **own** adapter — e.g. a closed, server-side headless engine —
  with no change to this package. Such adapters are not part of the OSS.

### Note: server-side adapters and privacy

The OSS conversion paths run **in the browser / Electron renderer**, so documents
never leave the device. A **server-side** adapter (e.g. a headless LibreOffice
backend) necessarily uploads the document to a server. Any product that adopts
one should treat that as an **explicit, user-visible choice**, not a silent
reroute. Where such an adapter shells out to a third-party binary (e.g.
`soffice`), it should run it as a **separate process** rather than
linking/bundling it, to keep that binary's license at arm's length.

## Migration phases

- **Phase 0 (this ADR):** document the direction.
- **Phase 1:** add the `DocumentConverter` port + registry to `core` (non-breaking, no new deps).
- **Phase 2:** extract `@lumvale/pdf-browser`; move `conversion.ts` there, implement the port, repoint `PDFUploader`; republish `core` + `pdf-browser` + `ui`.
- **Phase 3 (when desktop/headless ships):** add `@lumvale/pdf-node` with the chosen engine; wire it in the Electron main process.
- **Phase 4 (only if native per-OS):** add per-`(os,cpu)` binary leaf packages via `optionalDependencies`.
