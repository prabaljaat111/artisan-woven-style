import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Only these public values are loaded; never load private credentials from files.
export function loadHostingerPublicConfiguration(env, config = JSON.parse(readFileSync(new URL("./hostinger-public-config.json", import.meta.url), "utf8"))) {
  for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) {
    env[key] ??= config[key];
    env[`VITE_${key}`] ??= env[key];
  }
}

export function validateHostingerBuild(env, nodeVersion = process.versions.node) {
  const [major, minor] = nodeVersion.split(".").map(Number);
  if (!(major > 22 || (major === 22 && minor >= 12))) {
    throw new Error("Hostinger requires Node.js 22.12 or newer. Select Node 22 LTS in the hosting panel.");
  }
  const missing = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing public hosting configuration: ${missing.join(", ")}`);
  for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) {
    if (env[key] !== env[`VITE_${key}`]) {
      throw new Error(`Hosting configuration mismatch: ${key} and VITE_${key} must identify the same backend.`);
    }
  }
}

export function configureHostingerEnvironment(env) {
  env.HOSTINGER ??= "1";
  env.NITRO_PRESET ??= "node-server";
  env.NODE_ENV ??= "production";
  env.HOST ??= "0.0.0.0";
  env.NITRO_HOST ??= env.HOST;
  // Hostinger supplies PORT; do not override the platform's assigned port.
  env.NITRO_PORT ??= env.PORT ?? "3000";
}

export function validateHostingerStartup(env, serverEntry) {
  if (!existsSync(serverEntry)) {
    throw new Error("dist/server/index.mjs is missing. Run npm run build:hostinger before starting the app.");
  }
  const missing = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing hosting environment variables: ${missing.join(", ")}. Add them in Hostinger before restarting.`);
  }
}

export function resolveHostingerServerEntry(launcherUrl) {
  return fileURLToPath(new URL("./dist/server/index.mjs", launcherUrl));
}

// Mirror the built static assets into a top-level "build" directory so Hostinger
// configurations that expect an output directory named "build" also succeed.
export function syncHostingerStaticOutput(rootDir) {
  const source = join(rootDir, "dist", "client");
  if (!existsSync(source)) {
    throw new Error("dist/client is missing after the Hostinger build; cannot prepare the build output directory.");
  }
  const target = join(rootDir, "build");
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  return target;
}