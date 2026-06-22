![LumvalePDF Logo](ui/public/Lumvale-pdf-dark.svg)

> A free, high-quality, fast, and fully **offline** open-source PDF toolkit. All operations run entirely on your device — no file is ever uploaded to a third-party server.

---

## 💖 Open Source & Community Support

LumvalePDF is proudly built as an **open-source project** because we believe powerful document tools should be accessible to everyone without violating user privacy. 

However, developing and maintaining a high-quality desktop application takes significant time and resources. If LumvalePDF has saved you time or money, please consider supporting the project! Your contributions directly fund server costs, software licenses (like Code Signing certificates), and ongoing development.

* 🌟 **[Sponsor us on GitHub](https://github.com/sponsors/Lumvale)**
* ☕ **[Buy us a coffee on Ko-Fi](https://ko-fi.com/lumvale)**
* 🚀 **[Support us on Patreon](https://patreon.com/lumvale)**

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
lumvale-pdf/
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

For a detailed look at upcoming features, planned enhancements, and project milestones, please 👉 **[See our Full Feature Roadmap here](ROADMAP.md)**.

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
