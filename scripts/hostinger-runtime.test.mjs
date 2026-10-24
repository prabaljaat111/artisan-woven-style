import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureHostingerEnvironment, validateHostingerStartup, resolveHostingerServerEntry } from "./hostinger-runtime.mjs";

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