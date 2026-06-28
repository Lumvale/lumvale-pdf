/**
 * @lumvale/pdf-ui — the LumvalePDF workspace as a consumable component library.
 *
 * Exposes the desktop-style document workspace (menu bar, toolbar, page
 * sidebar, canvas, and operation modals) so other frontends — e.g. a web SaaS —
 * can embed the same experience instead of reimplementing it.
 * Electron-only behavior in these components is already guarded behind
 * `window.electronAPI?.…`, so they run unchanged on the web.
 *
 * The engine is wired directly to the local @lumvale/pdf-core via a small
 * DocumentEngine port (see ./engine), so the package depends only on public
 * packages. Host apps can embed the workspace and, if needed, supply their own
 * engine implementation through the same port.
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

// Engine wiring. pdf-ui uses the local @lumvale/pdf-core adapter, exposed here
// so host apps embedding the workspace can reuse the same DocumentEngine and
// port types — or supply their own engine — instead of re-deriving them.
export { documentEngine, useDocumentEngine, createPdfCoreEngine } from "./engine";
export type {
  DocumentEngine,
  DocumentMetadata,
  WatermarkOptions,
  BatesOptions,
  HeaderFooterOptions,
  EncryptOptions,
  PdfPermissions,
  PageSource,
} from "./engine";
