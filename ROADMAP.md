# LumvalePDF Feature Roadmap

### A. Core Features (Implemented)
- **Text Extraction**: Extract raw text from standard PDF documents.
- **PDF Merging (Dual-Pane Workspace)**: Advanced merge UI featuring dual panes. Users can drag, drop, and sequence individual pages between documents.
- **Lossless Compression**: Compress internal PDF streams to reduce file size without losing quality.
- **Metadata Manager**: View and edit properties such as Title, Author, Subject, Creator, and creation dates.
- **Page Range Extractor**: Carve out specific pages (e.g. pages 2–5) into a new document.

### B. Advanced Optimisation & Compression (Size Reduction)
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
