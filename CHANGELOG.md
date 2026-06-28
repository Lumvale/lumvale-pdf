# Changelog

All notable changes to the Lumvale-PDF project will be documented in this file.

## [Unreleased]

### Added
- **Document permission flags for encryption** (`@lumvale/pdf-core` 1.2.0, `@lumvale/pdf-ui` 0.3.0):
  `exportEncryptedBytes` / the engine `encrypt` option now accept granular `permissions`
  (printing, modifying, copying, annotating, filling forms, accessibility, document assembly),
  letting callers restrict what recipients can do — not just set a password. Adds the
  `PdfPermissions` type and `computePermissions()` helper. Permissions require a distinct owner
  password (enforced with a clear error). Backward compatible: the default remains "all allowed".
  Internally vendors a permission-aware fork of `@pdfsmaller/pdf-encrypt-lite` (MIT), since the
  published package hardcodes the permission value. See `docs/proposals/encrypt-permissions.md`.

## [1.0.0] - Initial Open Source Release

### Added
- **Read-Only / Edit Mode Protection**: Implemented a default Read-Only state to prevent accidental document modification. Safely locked drag-and-drop page reordering, page deletion, merging, compression, metadata editing, and encryption behind an explicit "Edit Mode" toggle.
- **Active Page Tracking (Sidebar Sync)**: Scrolling the main PDF canvas provides real-time feedback in the side panel. The active thumbnail gets a glow ring, scale-up animation, and a 'Viewing' pill badge. The bookmark panel highlights the active bookmark using a sorted flat list for range-based sticky highlighting.
- **High-DPI (Retina) Crisp Rendering**: PDF canvases now render perfectly crisp text and vector graphics on modern high-resolution displays by multiplying the canvas backing store dimensions by the device pixel ratio.

### Fixed
- Fixed bug where the thumbnail panel didn't scroll to the active page because bounds were checked against the wrong container.
- Fixed bug where bookmark glow disappeared between sections by replacing exact-page-match with a sorted flat-list range lookup.
- Fixed bug where bookmark clicks showed the page halfway on the first click by using `scrollIntoView` with CSS `scroll-margin-top`.
