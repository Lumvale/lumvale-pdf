/**
 * @lumvalepdf/ui — the LumvalePDF workspace as a consumable component library.
 *
 * Exposes the desktop-style document workspace (menu bar, toolbar, page
 * sidebar, canvas, and operation modals) so other frontends — e.g. the Lumvale
 * Omnia web SaaS — can embed the same experience instead of reimplementing it.
 * Electron-only behavior in these components is already guarded behind
 * `window.electronAPI?.…`, so they run unchanged on the web.
 *
 * Peer deps: react, react-dom. The PDF engine (@lumvalepdf/core) and feature
 * libraries are regular dependencies and install transitively.
 */
export { default as Workspace } from "./components/Workspace";
export { default as PDFUploader } from "./components/PDFUploader";
export { default as RecentFiles } from "./components/RecentFiles";
export { initializeTheme, toggleTheme, isDarkMode } from "./utils/theme";
export type { Annotation, AnnotationType } from "./components/AnnotationOverlay";
