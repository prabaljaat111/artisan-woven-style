// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { NitroConfig } from "nitro/types";

const hostingerNodeBuild =
  process.env.HOSTINGER === "1" ||
  process.env.NITRO_PRESET === "node-server" ||
  process.env.NITRO_PRESET === "node";

const vercelBuild = process.env.NITRO_PRESET === "vercel";

// The wrapper forwards Nitro options but exposes a narrower inline type.
const hostingerNitroConfig: NitroConfig = {
  preset: "node-server",
  output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
  compressPublicAssets: { gzip: true, brotli: true },
  routeRules: {
    "/assets/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
  },
};

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  nitro: hostingerNodeBuild
    ? hostingerNitroConfig
    : vercelBuild
    ? {
        preset: "vercel",
      }
    : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
});
