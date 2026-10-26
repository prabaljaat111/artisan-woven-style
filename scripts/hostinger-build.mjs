import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadHostingerPublicConfiguration, syncHostingerStaticOutput, validateHostingerBuild } from "./hostinger-runtime.mjs";

try {
  loadHostingerPublicConfiguration(process.env);
  validateHostingerBuild(process.env);
  if (process.argv.includes("--check")) {
    console.info("Hostinger build prerequisites passed. Full checkout still requires a supported backend migration.");
  } else {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
    const result = spawnSync(process.execPath, [vite, "build"], {
      cwd: root,
      env: { ...process.env, HOSTINGER: "1", NITRO_PRESET: "node-server" },
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error("Hostinger preparation failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}