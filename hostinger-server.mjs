import { pathToFileURL } from "node:url";
import { configureHostingerEnvironment, loadHostingerPublicConfiguration, resolveHostingerServerEntry, validateHostingerStartup } from "./scripts/hostinger-runtime.mjs";

configureHostingerEnvironment(process.env);
const serverEntry = resolveHostingerServerEntry(import.meta.url);

try {
  loadHostingerPublicConfiguration(process.env);
  validateHostingerStartup(process.env, serverEntry);
  if (process.argv.includes("--check")) {
    console.info("Hostinger startup checks passed.");
  } else {
    await import(pathToFileURL(serverEntry).href);
  }
} catch (error) {
  console.error("Hostinger startup failed:", error instanceof Error ? error.message : "Unknown startup error");
  process.exitCode = 1;
}