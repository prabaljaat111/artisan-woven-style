// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const hostingerNodeBuild =
  process.env.HOSTINGER === "1" ||
  process.env.NITRO_PRESET === "node-server" ||
  process.env.NITRO_PRESET === "node";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  nitro: hostingerNodeBuild
    ? {
        preset: "node-server",
        output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
      }
    : undefined,
  tanstackStart: {
    server: { entry: "/src/server.ts" },
  },
});
