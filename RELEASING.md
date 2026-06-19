# Releasing

LumvalePDF is an **independently-versioned monorepo**: each package
(`@lumvale/pdf-core`, `@lumvale/pdf-browser`, `@lumvale/pdf-ui`) has its own
version and is released on its own cadence. These are the conventions to follow.

## Versioning

- Each package versions **independently** (semver). Bump only the packages that
  changed. A dependent that *consumes* a changed package may also need a bump
  (e.g. `pdf-ui` when it adopts a new `pdf-browser`).
- The root `package.json` version is not meaningful — don't tag off it.

## Tags

- Format: **`@scope/pkg@version`** — e.g. `@lumvale/pdf-core@1.1.0`. This is the
  Changesets/npm-monorepo convention (cf. Astro `create-astro@x`, Cloudflare
  `wrangler@x`).
- **Do not** use `vX.Y.Z` for package releases — that form is for single-package
  or fixed-version repos. Also avoid `pkg-vX.Y.Z`.
- ⚠️ **Never start a tag with `v`** unless you intend to ship the desktop app:
  `release.yml` triggers on `v*` tags and runs `electron-builder` across
  Win/Mac/Linux. The package tags above start with `@`, so they don't trigger it.
  (Note: `release.yml` must be updated to build the `browser` workspace before
  the Electron step — see CI notes — before any `v*` desktop release will pass.)

## GitHub Releases

- **One release per changed package.** Each gets its own release + tag.
- **Title = the bare `package@version`** (matching the tag), e.g.
  `@lumvale/pdf-core@1.1.0`. Put the changelog/description in the **body**, not
  the title.
- Mark the most recent as **Latest**.
- *Exception:* a single **combined** release is acceptable for a large
  coordinated milestone that spans all packages (e.g. the ADR-0001 package
  restructure) — tell the story once instead of fragmenting it into thin notes.

## Publishing to npm

Publishing must run from a **maintainer's terminal** — the security-key 2FA
can't satisfy the CLI's OTP via automation tokens (`EOTP`); approving the browser
prompt in your own shell is the working path.

```bash
# from the repo root — workspace-aware install + build in dependency order
npm install
npm run build --workspace=core
npm run build --workspace=browser
npm run build --workspace=ui

# publish in dependency order (a dependent must not publish before its dep)
npm publish --workspace=core       # @lumvale/pdf-core
npm publish --workspace=browser    # @lumvale/pdf-browser
npm publish --workspace=ui         # @lumvale/pdf-ui
```

Then create the tag(s) and GitHub Release(s) per the conventions above, and bump
any downstream consumer's dependency range.

## CI / build note

CI and release workflows must do a **root (workspace) `npm install`** and build
in order **core → browser → ui** — `ui`'s `tsc` needs `@lumvale/pdf-browser`'s
emitted types. A per-package `cd ui && npm install` will fail to resolve the
local packages.

## Future: automate with Changesets

The manual steps above are what [Changesets](https://github.com/changesets/changesets)
automates: contributors add a short changeset per PR; on release it bumps
versions, writes per-package changelogs, creates the `@scope/pkg@version` tags,
and publishes per-package GitHub Releases. Adopt it once releases become
frequent — it codifies every convention in this document.
