import { defineConfig } from "tsup";

/**
 * Library build for @lumvale/pdf-ui. Compiles the workspace components to ESM
 * (class names preserved as string literals so a consumer's Tailwind can scan
 * dist/ and generate the matching utilities). react/react-dom are externalized
 * as peers; all other dependencies stay external and install transitively.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  tsconfig: "tsconfig.lib.json",
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  // Vite-only virtual import used solely by the standalone app bootstrap.
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
