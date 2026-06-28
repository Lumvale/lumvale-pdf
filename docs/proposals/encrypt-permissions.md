# Proposal: Document permission flags for `encrypt`

**Status:** Accepted — implemented (`@lumvale/pdf-core` 1.2.0, `@lumvale/pdf-ui` 0.3.0).
The vendor-fork option was chosen; see `core/src/vendor/pdf-encrypt/`.
**Packages affected:** `@lumvale/pdf-core` (minor), `@lumvale/pdf-ui` (minor)
**Type:** Feature — additive, backward compatible

## Summary

Today the engine can password-encrypt a document, but it always writes a
permission value of `0xFFFFFFFC` ("everything allowed"). This proposal adds
**granular permission flags** (print / modify / copy / annotate / fill forms /
accessibility / assemble) so a host application can produce a PDF that is
restricted independently of full password protection — e.g. "anyone can open
it, but printing and copying are disallowed".

This is the standard "Restrict permissions" capability competitors ship and the
last missing piece of the engine's Secure surface.

## Background — how encryption works today

`LumvalePDFEngine.exportEncryptedBytes(userPassword?, ownerPassword?)`
(`core/src/index.ts`) delegates to `encryptPDF` from the MIT-licensed
`@pdfsmaller/pdf-encrypt-lite`. Inside that library (`dist/pdf-encrypt.js`):

```js
// Set permissions (all allowed for now)
const permissions = 0xFFFFFFFC; // -4 in signed 32-bit
...
const encryptionKey = computeEncryptionKey(userPassword, ownerKey, permissions, fileId);
...
const encryptDict = context.obj({
  Filter: PDFName.of('Standard'),
  V: PDFNumber.of(2), R: PDFNumber.of(3), Length: PDFNumber.of(128),
  P: PDFNumber.of(permissions),     // ← the permission bits
  O: ..., U: ...,
});
```

The permission integer is **hashed into the encryption key** (Algorithm 2) *and*
written as `/P`. That means **`/P` cannot be patched after encryption** — the key
derivation includes it, so changing `/P` alone produces a corrupt file. The
permission value must be chosen *before* the key is computed, i.e. inside the
encryption routine. This rules out a post-processing approach in `pdf-core`.

## The PDF permission model (PDF 32000-1, Table 22, security handler R≥3)

`/P` is a signed 32-bit integer. Bit 1 is the lowest bit. "Allowed" = bit set.

| Bit | Value | Meaning |
| --- | ----- | ------- |
| 3   | 4     | Print (low-res if bit 12 clear) |
| 4   | 8     | Modify contents |
| 5   | 16    | Copy / extract text & graphics |
| 6   | 32    | Add/modify annotations & fill form fields |
| 9   | 256   | Fill existing form fields |
| 10  | 512   | Extract for accessibility |
| 11  | 1024  | Assemble (insert/delete/rotate pages) |
| 12  | 2048  | Print high-resolution |

Bits 1–2 must be 0; bits 7–8 and 13–32 must be 1. `0xFFFFFFFC` (= −4) is
therefore "all allowed". To **deny** a capability, clear its bit from that base.

> **Important semantics:** permissions are only enforced by conformant readers
> when the document is opened with the **user** password, i.e. an **owner
> password distinct from the user password must be set**. If `ownerPassword` is
> omitted (so owner == user), `/P` is advisory and most readers ignore it. The
> API below should therefore require a distinct `ownerPassword` whenever any
> permission is restricted (see Validation).

## Proposed API

### `@lumvale/pdf-core`

```ts
/** Granular permissions. Each flag defaults to allowed (true). */
export interface PdfPermissions {
  printing?: boolean;            // bit 3 (+ bit 12 high-res)
  modifying?: boolean;           // bit 4
  copying?: boolean;             // bit 5
  annotating?: boolean;          // bit 6
  fillingForms?: boolean;        // bit 9
  contentAccessibility?: boolean;// bit 10
  documentAssembly?: boolean;    // bit 11
}

/** Compute the signed 32-bit /P value from a permissions object. */
export function computePermissions(p: PdfPermissions = {}): number {
  let bits = 0xFFFFFFFC; // all allowed (reserved bits 1,2 = 0)
  const deny = (mask: number) => { bits &= ~mask; };
  if (p.printing === false)             deny(0x4 | 0x800); // bit 3 + bit 12
  if (p.modifying === false)            deny(0x8);
  if (p.copying === false)              deny(0x10);
  if (p.annotating === false)           deny(0x20);
  if (p.fillingForms === false)         deny(0x100);
  if (p.contentAccessibility === false) deny(0x200);
  if (p.documentAssembly === false)     deny(0x400);
  return bits | 0; // force signed 32-bit
}
```

`exportEncryptedBytes` gains an optional third argument:

```ts
public async exportEncryptedBytes(
  userPassword?: string,
  ownerPassword?: string,
  permissions?: PdfPermissions,
): Promise<Uint8Array> {
  if (!this.pdfDoc) throw new Error("No document loaded");
  const unencryptedBytes = await this.pdfDoc.save({ useObjectStreams: false, objectsPerTick: Infinity });
  const p = computePermissions(permissions);
  // encryptPDF must accept the permission integer (see "Dependency change").
  return encryptPDF(unencryptedBytes, userPassword || '', ownerPassword || undefined, p);
}
```

### `@lumvale/pdf-ui`

`port.ts` — extend the engine-agnostic options:

```ts
export interface EncryptOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: PdfPermissions; // re-exported from @lumvale/pdf-core
}
```

`pdfCoreEngine.ts` — thread it through:

```ts
async encrypt(documentBytes, options: EncryptOptions) {
  const engine = new LumvalePDFEngine();
  await engine.loadDocument(documentBytes);
  return engine.exportEncryptedBytes(options.userPassword, options.ownerPassword, options.permissions);
}
```

(`EncryptionModal.tsx` can later grow checkboxes for each flag; not required for
this engine-level change.)

## Dependency change (the one real decision)

`encryptPDF` currently hardcodes the permission integer. It must accept it.
Two options:

1. **Vendor a minimal fork (recommended).** `@pdfsmaller/pdf-encrypt-lite` is
   MIT and ~7 KB. Copy it into `core/src/vendor/pdf-encrypt/` (preserving the
   MIT notice) and change two lines: add a `permissions = 0xFFFFFFFC` parameter
   to `encryptPDF` and delete the hardcoded constant. This puts a
   security-critical path under our own control and ships without waiting on an
   upstream release.

2. **Upstream PR + dep bump.** Send the same two-line change to
   `pdf-encrypt-lite`, then bump the dependency. Lower maintenance, but gated on
   the upstream maintainer's cadence.

The two-line change in either case:

```diff
- async function encryptPDF(pdfBytes, userPassword, ownerPassword = null) {
+ async function encryptPDF(pdfBytes, userPassword, ownerPassword = null, permissions = 0xFFFFFFFC) {
    ...
-   // Set permissions (all allowed for now)
-   const permissions = 0xFFFFFFFC; // -4 in signed 32-bit
    const ownerKey = computeOwnerKey(ownerPassword, userPassword);
```

Everything else in the library already flows `permissions` correctly into both
the key derivation and the `/P` entry.

## Validation

- When any flag is set to `false`, require a non-empty `ownerPassword` that
  differs from `userPassword`; otherwise throw (`"Restricting permissions
  requires a distinct owner password"`) — without it the restriction is not
  enforced and would silently mislead callers.
- `computePermissions({})` must return exactly `-4` (unchanged behaviour).

## Tests (`core/src/engine.test.ts`)

- `computePermissions({})` === `-4` (back-compat: default unchanged).
- `computePermissions({ printing: false })` clears bits 3 and 12.
- `computePermissions({ copying: false })` clears bit 5 only.
- Encrypt with `{ printing: false }` + owner password → reload the bytes with
  pdf-lib (`ignoreEncryption: true`) and assert the `/Encrypt` `/P` equals the
  expected negative integer.
- Encrypting with a restricted flag and **no** distinct owner password throws.

## Backward compatibility

Fully additive. `exportEncryptedBytes(user, owner)` and `encrypt({ userPassword,
ownerPassword })` are unchanged; the new third argument / `permissions` field are
optional and default to "all allowed".

## Release

Per the repo conventions: a **minor** bump of `@lumvale/pdf-core` first, publish,
then a **minor** bump of `@lumvale/pdf-ui` depending on it. Tag each package as
`@lumvale/pdf-core@x.y.0` / `@lumvale/pdf-ui@x.y.0` with its own GitHub release.

## Downstream

Once published, host applications can expose a "Restrict permissions" UI by
passing `permissions` into the existing `encrypt` call — no further engine work
required.
