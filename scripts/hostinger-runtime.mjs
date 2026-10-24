import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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