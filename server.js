import { existsSync } from "node:fs";
import { resolve } from "node:path";

process.env.HOSTINGER ??= "1";
process.env.NITRO_PRESET ??= "node-server";
process.env.HOST ??= "0.0.0.0";

const serverEntry = resolve("dist/server/index.mjs");

if (!existsSync(serverEntry)) {
  console.error(
    "Hostinger start failed: dist/server/index.mjs is missing. Run `npm run build:hostinger` before starting the app.",
  );
  process.exit(1);
}

await import(serverEntry);