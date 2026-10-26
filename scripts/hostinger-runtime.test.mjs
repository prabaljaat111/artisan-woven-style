import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureHostingerEnvironment, loadHostingerPublicConfiguration, syncHostingerStaticOutput, validateHostingerBuild, validateHostingerStartup, resolveHostingerServerEntry } from "./hostinger-runtime.mjs";

const publicConfig = { SUPABASE_URL: "https://example.test", SUPABASE_PUBLISHABLE_KEY: "public-test-key" };

test("loads browser and server public configuration without loading private keys", () => {
  const env = {};
  loadHostingerPublicConfiguration(env, { ...publicConfig, SUPABASE_SERVICE_ROLE_KEY: "must-not-load" });
  assert.deepEqual(env, { ...publicConfig, VITE_SUPABASE_URL: publicConfig.SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: publicConfig.SUPABASE_PUBLISHABLE_KEY });
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, undefined);
});

test("preserves external hosting public configuration overrides", () => {
  const env = { SUPABASE_URL: "https://other.test", SUPABASE_PUBLISHABLE_KEY: "other-public-key" };
  loadHostingerPublicConfiguration(env, publicConfig);
  assert.equal(env.SUPABASE_URL, "https://other.test");
  assert.equal(env.VITE_SUPABASE_PUBLISHABLE_KEY, "other-public-key");
});

test("checks the minimum supported Node version before building", () => {
  const env = {};
  loadHostingerPublicConfiguration(env, publicConfig);
  assert.throws(() => validateHostingerBuild(env, "22.11.0"), /22.12/);
  assert.doesNotThrow(() => validateHostingerBuild(env, "22.12.0"));
  assert.doesNotThrow(() => validateHostingerBuild(env, "24.0.0"));
});

test("rejects missing browser configuration before building", () => {
  assert.throws(() => validateHostingerBuild(publicConfig, "22.12.0"), /VITE_SUPABASE_URL/);
});

test("rejects different server and browser backend configurations", () => {
  const env = {};
  loadHostingerPublicConfiguration(env, publicConfig);
  env.VITE_SUPABASE_URL = "https://wrong.test";
  assert.throws(() => validateHostingerBuild(env, "22.12.0"), /configuration mismatch/);
});

test("uses Hostinger's assigned port and binds to all interfaces", () => {
  const env = { PORT: "4567" };
  configureHostingerEnvironment(env);
  assert.equal(env.NITRO_PORT, "4567");
  assert.equal(env.NITRO_HOST, "0.0.0.0");
  assert.equal(env.NODE_ENV, "production");
});

test("preserves explicitly configured Nitro host and port", () => {
  const env = { PORT: "4567", NITRO_PORT: "5678", NITRO_HOST: "127.0.0.1" };
  configureHostingerEnvironment(env);
  assert.equal(env.NITRO_PORT, "5678");
  assert.equal(env.NITRO_HOST, "127.0.0.1");
});

test("resolves built entry relative to the launcher, not working directory", () => {
  assert.equal(resolveHostingerServerEntry("file:///var/www/store/hostinger-server.mjs"), "/var/www/store/dist/server/index.mjs");
});

test("rejects missing build output with an actionable error", () => {
  assert.throws(() => validateHostingerStartup({}, "/nonexistent/ihs/server.mjs"), /Run npm run build:hostinger/);
});

test("mirrors dist/client into a build output directory for static-style deployments", () => {
  const dir = mkdtempSync(join(tmpdir(), "ihs-hostinger-build-"));
  mkdirSync(join(dir, "dist", "client", "assets"), { recursive: true });
  writeFileSync(join(dir, "dist", "client", "index.html"), "<html></html>");
  writeFileSync(join(dir, "dist", "client", "assets", "app.js"), "console.log(1);");
  try {
    const target = syncHostingerStaticOutput(dir);
    assert.equal(target, join(dir, "build"));
    assert.equal(readFileSync(join(dir, "build", "index.html"), "utf8"), "<html></html>");
    assert.equal(readFileSync(join(dir, "build", "assets", "app.js"), "utf8"), "console.log(1);");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails clearly when the build output directory has no static files to mirror", () => {
  const dir = mkdtempSync(join(tmpdir(), "ihs-hostinger-build-"));
  try {
    assert.throws(() => syncHostingerStaticOutput(dir), /dist\/client is missing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("requires public server configuration but not an unavailable admin key", () => {
  const dir = mkdtempSync(join(tmpdir(), "ihs-hostinger-"));
  const entry = join(dir, "index.mjs");
  writeFileSync(entry, "export default {};");
  try {
    assert.throws(() => validateHostingerStartup({}, entry), /SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotThrow(() => validateHostingerStartup({ SUPABASE_URL: "https://example.test", SUPABASE_PUBLISHABLE_KEY: "public-test-key" }, entry));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});