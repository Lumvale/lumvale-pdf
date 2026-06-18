import { defineConfig } from "tsup";

/**
 * Library build for @lumvale/pdf-browser. ESM only (consumed by bundlers in
 * browser/Electron frontends). All dependencies — the conversion libraries and
 * @lumvale/pdf-core — stay external and install transitively.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
