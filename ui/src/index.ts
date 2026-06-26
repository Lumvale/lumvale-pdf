/**
 * @lumvale/pdf-ui — the LumvalePDF workspace as a consumable component library.
 *
 * Exposes the desktop-style document workspace (menu bar, toolbar, page
 * sidebar, canvas, and operation modals) so other frontends — e.g. a web SaaS —
 * can embed the same experience instead of reimplementing it.
 * Electron-only behavior in these components is already guarded behind
 * `window.electronAPI?.…`, so they run unchanged on the web.
 *
 * This is the canonical PDF editor: a complete, standalone OSS product. The
 * engine is wired directly to the local @lumvale/pdf-core via a vendored
 * DocumentEngine port (see ./engine) — no private dependencies. Commercial
 * suites depend on this package and add AI/cloud/shell on top.
 *
 * Peer deps: react, react-dom. The PDF engine (@lumvale/pdf-core) and feature
 * libraries are regular dependencies and install transitively.
 */
export { default as Workspace } from "./components/Workspace";
export type { WorkspaceProps } from "./components/Workspace";
export { default as TabbedWorkspace } from "./components/TabbedWorkspace";
export { default as PDFUploader } from "./components/PDFUploader";
export { default as RecentFiles } from "./components/RecentFiles";
export { initializeTheme, toggleTheme, isDarkMode } from "./utils/theme";
export * from "./utils/fileProcessor";
export type { Annotation, AnnotationType } from "./components/AnnotationOverlay";

// Engine wiring. OSS pdf-ui always uses the local @lumvale/pdf-core adapter
// (the engine never varies), exposed here so hosts/consumers — e.g. the
// commercial pdf-module or Omnia — can reuse the same DocumentEngine and port
// types instead of re-deriving them. The shape mirrors the private
// @lumvale/workspace-contracts port, vendored locally to keep this package's
// dependencies fully public.
export { documentEngine, useDocumentEngine, createPdfCoreEngine } from "./engine";
export type {
  DocumentEngine,
  DocumentMetadata,
  WatermarkOptions,
  BatesOptions,
  HeaderFooterOptions,
  EncryptOptions,
  PageSource,
} from "./engine";
