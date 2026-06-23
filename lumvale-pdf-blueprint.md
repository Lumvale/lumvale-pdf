# LumvalePDF System Blueprint

This document serves as the continuous architectural anchor for the LumvalePDF project, mapping the relationships between the UI, the Core engine, and external integrations.

## Core Architecture

```mermaid
graph TD
    UI[UI Layer - React 19 + Tailwind v4] --> Core[Core Engine - @lumvalepdf/core]
    UI --> Theme[Brand System - lumvale-storybook]
    Core --> Wasm[WebAssembly / pdf-lib / pdf-encrypt-lite]
    
    subgraph Core [@lumvalepdf/core]
        Index[index.ts - Core SDK API]
        Conv[conversion.ts - Data Converters]
    end
    
    subgraph UI Layer
        App[App.tsx - Routing & State]
        Components[UI Components]
        Workers[Web Workers - Off-Main-Thread Execution]
    end
    
    Components --> Theme
    Workers --> Core
```

## Strategic Rejections Log

**Feature:** Image Downsampling (Advanced Compression)
**Status:** ❌ REJECTED
**Reasoning:** Overly Complex & Misaligned. Implementing native image downsampling within the `@lumvalepdf/core` module requires introducing a cross-platform image processing dependency (e.g., `sharp` for Node, `HTMLCanvas` for Browser). This breaks the lightweight, zero-dependency, environment-agnostic WebAssembly design of the core engine. Until a pure WASM image encoding library is standardized, this feature introduces too much architectural drift.

## Next Validated Target

**Feature:** Bates Numbering (Legal Document Stamping)
**Status:** ✅ IMPLEMENTED
**Validation:**
1. **Integration:** Aligns perfectly with existing `pdf-lib` text-drawing capabilities via `engine.addBatesNumbering`.
2. **Unique Value:** Provides essential utility for legal and medical professionals who need to sequentially stamp thousands of pages.
3. **Redundancy:** Not currently handled by existing modules. Watermarks are static; Bates numbers are dynamic and sequential.

### UI Integration Path
- `Toolbar.tsx` -> `Workspace.tsx` -> `BatesModal.tsx` -> `LumvalePDFEngine.addBatesNumbering()`
