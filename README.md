![LumvalePDF Logo](ui/public/Lumvale-pdf-dark.svg)

> A free, high-quality, fast, and fully **offline** open-source PDF toolkit. All operations run entirely on your device — no file is ever uploaded to a third-party server.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture-monorepo)
2. [Library Packaging](#2-library-packaging)
3. [Current Features](#3-current-features)
4. [Full Feature Roadmap](#4-full-feature-roadmap)
5. [Library Distribution](#6-portability--multi-language-library-distribution)
6. [Open-Source Licensing Strategy](#7-open-source-licensing-strategy)
7. [Visual Identity & UX Design](#8-visual-identity-themes--extraordinary-ux-design)
8. [Desktop & OS Integration](#9-desktop--os-integration)
9. [Building from Source](#10-building-from-source)
10. [Auto-Update Pipeline](#11-desktop-app--auto-updates)

---

## 1. Project Architecture (Monorepo)

To cleanly separate the core utility engine from the user interface while maintaining unified development cycles, LumvalePDF is structured as a monorepo:

```
lumvalepdf/
├── core/        # WebAssembly Engine & core libraries
├── ui/          # React 19 + Tailwind v4 + Vite PWA / Electron
└── README.md
```

The core features are packaged as a standard JS/TS library that exposes clean, typed, programmatic APIs running directly in JavaScript/WebAssembly — no server required.

---

## 2. Library Packaging

### A. WebAssembly and JS Modules

The core engine compiles to WebAssembly and ships as an ESM/CommonJS library. It runs in any JavaScript environment: browser tabs, Electron renderers, Node.js backends, and mobile webviews.

### B. Consuming the Library

Other frontends can directly import the React/TS components and libraries. Backends can call CLI utilities or WASM-under-node packages - making Lumvale-PDF a drop-in dependency.

---

## 3. Current Features

| Feature | Status |
|---|---|
| Merge PDFs | ✅ Dual-pane drag-and-drop workspace |
| Extract Pages | ✅ Visual selection with download |
| Lossless Compression | ✅ In-browser stream compression |
| Metadata Manager | ✅ View / edit / scrub Title, Author, Keywords, etc. |
| Password Protection | ✅ 128-bit RC4 encryption, User + Owner passwords |
| Page Reordering | ✅ Drag-and-drop thumbnail sidebar |
| Page Rotation | ✅ 90° increments per page |
| Page Deletion | ✅ Per-page trash action |
| Watermarking | ✅ Customisable text watermark overlay |
| Split PDF | ✅ Range-based document splitting |
| Smart Page Sync | ✅ Thumbnail + bookmark panel track scroll position in real time |
| Edit Mode Protection | ✅ Read-only default; destructive actions locked behind Edit Mode toggle |
| Auto-Updates | ✅ electron-updater via GitHub Releases |

### Smart Page Sync (Detail)

As you scroll the main PDF canvas, the thumbnail panel automatically:
- Highlights the current page with a **3px glowing accent ring** and a live **`● Viewing` badge**
- **Auto-scrolls** the panel to keep the active thumbnail visible
- Bold-accents the page number label

The Bookmarks panel mirrors this:
- The bookmark that **owns** the current page position stays highlighted with a full accent bar
- When scrolling between bookmarks, the owning bookmark dims gracefully rather than disappearing
- Active bookmark auto-scrolls into view

---

## 4. Full Feature Roadmap

### A. Core Features (Implemented)
- **Text Extraction**: Extract raw text from standard PDF documents.
- **PDF Merging (Dual-Pane Workspace)**: Advanced merge UI featuring dual panes. Users can drag, drop, and sequence individual pages between documents.
- **Lossless Compression**: Compress internal PDF streams to reduce file size without losing quality.
- **Metadata Manager**: View and edit properties such as Title, Author, Subject, Creator, and creation dates.
- **Page Range Extractor**: Carve out specific pages (e.g. pages 2–5) into a new document.

### B. Advanced Optimisation & Compression (Size Reduction)
- **Image Downsampling**: Reduce the DPI (72, 150, 300) of images embedded in the PDF to cut file sizes for web viewing.
- **Image Recoding**: Convert heavy uncompressed images inside PDF streams to JPEG or modern WebP formats.
- **Font Subsetting**: Remove unused character glyphs from embedded fonts so only used characters are kept.
- **Resource Stripping**: Strip duplicate forms, hidden layers, annotations, and unneeded colour profiles.

### C. Templating, Formatting & Styling (PDF Generation Engine)
- **HTML/CSS to PDF Engine**: Write or modify documents using standard HTML + CSS (custom fonts, margins, page-breaks, CSS grids).
- **Dynamic Markdown Templates**: Write templates in Markdown and inject dynamic JSON context fields to render clean invoices.
- **Built-In Theme Templates**: Pre-designed templates for Invoices, Resumes, Business Proposals, and Meeting Minutes.
- **CSS Page Paged Media Support**: Enable margins, headers, page numbers, and custom print layouts natively through CSS `@page`.

### D. Professional Desktop Features (Adobe Acrobat Inspired)
- **Interactive Form Builder**: Insert, edit, and configure text boxes, dropdowns, radio buttons, and submit targets.
- **Permanent Content Redaction**: Purge targeted text or coordinates from the raw PDF byte streams (not just a visual overlay).
- **Cryptographic Digital Signatures (PKI)**: Seal documents using standard PKCS#12 (`.pfx`/`.p12`) certificates.
- **Bates Numbering**: Apply legal Bates numbering schemas across batch files.
- **PDF/A Standard Compliance**: Convert and validate files to PDF/A for long-term archiving.

### E. Technical & Preflight Tools
- **PDF Linearisation (Fast Web View)**: Restructure PDF bytes so the first page loads before the rest downloads.
- **Form Data Export/Import (FDF/XFDF)**: Import or export filled-out form data as XML/JSON.
- **Printing Preflight Analyser**: Verify high-resolution parameters, missing embedded fonts, and transparency layers before printing.
- **Colour Profile Conversion**: Convert between RGB, Grayscale, and CMYK colour spaces.
- **PDF Portfolio Packager**: Embed structured file systems (Excel, Word, CAD) inside a single container PDF.

### F. Comprehensive Multi-Format Conversion Engine
- **PDF → Word (`.docx`)**: Export pages into editable MS Word files preserving columns, headings, and tables.
- **PDF → Excel (`.xlsx`)**: Parse tabular data and export to structured spreadsheets.
- **PDF → PowerPoint (`.pptx`)**: Convert pages into slide deck frames.
- **PDF → Web Reader (HTML/ePub)**: Flow layouts into responsive HTML and standard ePub files.
- **Office → PDF (Import)**: Convert `.docx`, `.xlsx`, `.pptx`, and OpenOffice formats to PDF.
- **Images & Vectors → PDF**: Batch import PNG, JPEG, TIFF, WebP, and SVG into unified PDFs.
- **Schema Data Converter (JSON/CSV)**: Parse PDF forms into structured CSV/JSON, or render form layouts from schemas.

### G. Security, Annotations & Editing
- **Password & Encrypt**: Add User/Owner passwords and set permission flags (disable printing, copying, form modification).
- **Decrypt / Remove Password**: Strip security parameters from authorised PDFs.
- **Watermarking**: Add customisable text or image watermarks overlaying pages.
- **Visual Annotations**: Highlights, ink drawings, text note overlays, and shapes for document reviews.
- **Header & Footers**: Programmatically add page numbers (e.g. "Page X of Y") or custom date stamps.

### H. Advanced Page Organisation
- **Multi-Split**: Split a PDF by every N pages, or dynamically by document outlines/bookmarks.
- **Crop & Rotate**: Visual layout adjustment to crop margins or rotate pages 90/180°.
- **Extract Images**: Extract all embedded raster images into a ZIP folder.

### I. Advanced Workspace Mechanics & Workflow Pipelines
- **Chain-Operations Pipelines**: Build customised execution chains (e.g. Crop -> Auto-contrast -> Compress -> Sign) and run them as a single automation.
- **Stateful Temporary Processing**: Hold files in-memory for multiple editing passes (Undo/Redo) without saving intermediate versions.

### J. Project & Distribution Milestones
- **Mobile & Tablet Support (PWA)**: Polish the Progressive Web App (PWA) experience so LumvalePDF can be installed natively on iOS and Android devices as a fully offline mobile/tablet app. Enhance service worker caching for reliable offline operation on the go.
- **Code Signing Certificate (Windows SmartScreen)**: Register a corporate entity and integrate a standard OV Code Signing Certificate into the CI/CD pipeline so the .exe is trusted by Windows.
- **Cross-Platform Builds**: Add Mac (.dmg) and Linux (.AppImage) build CI/CD pipelines.
- **Developer Engine & NPM Publishing**: Publish the @lumvalepdf/core engine to NPM as an easily consumable standalone library for third-party developers to embed offline PDF capabilities directly inside their own React/Node applications.
- **Model Context Protocol (MCP) Server**: Build a dedicated MCP server to expose LumvalePDF's headless core operations (like merging, extracting text, or reading metadata) directly to AI agents and external Large Language Models (LLMs).
- **Community & Financial Sustainability**: Set up donation channels (GitHub Sponsors, Open Collective) and add a FUNDING.yml file to support ongoing open-source development.

---

## 5. Portability & Multi-Language Library Distribution

| Distribution Model | Details |
|---|---|
| **NPM Package (`@lumvalepdf/core`)** | ESM/CommonJS modules + compiled WASM binaries. Import directly into React/Vue/Node.js and run all operations offline. |
| **Python Wrapper (`lumvalepdf-core`)** | Python binding communicating with the JS/WASM core via local Node execution or Pyodide, for use with Python backends. |
| **Portable CLI Single-Binary** | Compiled with `pkg` (Node.js) into a single native binary (`lumvalepdf.exe` / `lumvalepdf`). Any language (Rust, Go, Python, C#) can invoke PDF operations via subprocess without a runtime installed. |

---

## 6. Open-Source Licensing Strategy

Selecting the correct licence is critical to ensure LumvalePDF can be imported freely as a third-party library by both commercial and closed-source systems without triggering copyleft requirements.

**Recommended: Apache License 2.0** (preferred over MIT)

| Licence | Notes |
|---|---|
| **MIT** | Extremely permissive. Zero copyleft. Anyone can use, copy, modify, merge, publish, and sell. |
| **Apache 2.0** ✅ | Like MIT but adds **explicit patent grants** and protection clauses. Protects contributors and users from patent litigation. |
| **GPL / AGPL** ❌ | Copyleft — any project using the library must also open-source its entire codebase. This would force commercial apps to go GPL if they linked Lumvale-PDF. |

---

## 7. Visual Identity, Themes & Extraordinary UX Design

To stand out in the open-source market, LumvalePDF prioritises a premium, interactive, and visually stunning user experience across all platforms:

- **Cute Soft Pastel Theme Palettes**: A default colour system based on clean, warm, inviting pastel shades (soft peach, mint cream, warm lavender, eggshell blue) — comfortable for long reading sessions.
- **Sleek Dark Mode Suite**: A deep slate/carbon dark mode with HSL-balanced contrast tokens to reduce screen glare, featuring a smart "Dark PDF Canvas" that inverts document page colours for night reading.
- **Micro-Animations & Fluid Transitions** (via Framer Motion): Every drag-and-drop thumbnail movement, panel collapse, and file conversion progress indicator features custom easing curves and organic bouncing transitions. Dragged cards float with a subtle 3D shadow and rotate slightly based on movement direction.
- **Glassmorphism Visual Layer**: Navigational panels and dialog overlays use `backdrop-filter` (frosted glass blur) and subtle gradient borders to create a premium, state-of-the-art UI depth.

---

## 8. Desktop, Mobile & OS Integration

LumvalePDF is designed to act as a first-class citizen on the user's operating system, whether on a desktop or a mobile device:

### Desktop (Electron)
- **Default PDF Viewer Registration**: The installer registers LumvalePDF as the default system handler for `.pdf` files in the Windows Registry and macOS LaunchServices. Double-clicking any PDF instantly opens it.
- **Shell Context Menus**: Integrates into the OS right-click menu (e.g. "Merge with LumvalePDF", "Compress PDF") so users can execute headless operations straight from the file explorer without opening the main UI.

### Mobile & Tablet (PWA) - *Roadmap*
- **Native File Handling**: Registration via the Web File Handling API so LumvalePDF appears as an option when tapping a PDF file on iOS and Android.
- **Share Target Integration**: Seamless integration with the mobile "Share Sheet" (Web Share Target API) allowing users to share PDFs directly from email clients or web browsers directly into the LumvalePDF offline workspace.

---

## 9. Building from Source

### Prerequisites
- [Node.js 20+](https://nodejs.org/) (Required to run the development environment)
- [Git](https://git-scm.com/)

### Quick Start (Recommended)

The easiest way to start the development server is to use the provided launch scripts in the root directory. These scripts automatically install all dependencies, compile the core WebAssembly engine, and launch the Electron/Vite frontend.

- **Windows**: Double-click `lumvale-pdf.bat`
- **macOS**: Double-click `lumvale-pdf.command` (or run `./lumvale-pdf.command` in terminal)
- **Linux**: Run `./lumvale-pdf.sh` in terminal

### Manual Setup

If you prefer to run the steps manually:

```bash
# 1. Build the core engine
cd core
npm install
npm run build

# 2. Start the UI dev server
cd ../ui
npm install
npm run dev
```

### Packaging for Desktop (Windows)

```bash
cd ui
npm run build
```

The resulting `.exe` installer will be in `ui/release`.

### Running Tests

```bash
cd ui
npx playwright test
```

Test fixtures (multi-page PDFs with and without bookmarks) are automatically generated by the Playwright global setup before each run — no manual setup required.

---

## 10. Desktop App & Auto-Updates

LumvalePDF is packaged as a native desktop application using **Electron**.

### Auto-Updater Pipeline

The desktop application features a fully automated update pipeline powered by `electron-updater` and GitHub Actions:

1. **How it works**: Whenever a new version tag (e.g. `v1.0.1`) is pushed, the GitHub Actions workflow (`.github/workflows/release.yml`) automatically builds the core engine, the UI, and packages the Windows NSIS installer via `electron-builder`.
2. **Releasing**: The workflow publishes the compiled `.exe` directly to GitHub Releases.
3. **Updating**: The app automatically polls the GitHub Releases API on startup. If a newer version is detected, it downloads the patch in the background and applies it on restart.
