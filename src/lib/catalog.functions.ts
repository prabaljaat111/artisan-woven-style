import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin-middleware";
import { SITE_URL } from "./feed";

export const catalogPreview = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async () => {
  const { loadFeedRows } = await import("./feed.server");
  return loadFeedRows();
});
export const checkPublishedCatalog = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((kind: "google" | "meta") => { if (kind !== "google" && kind !== "meta") throw new Error("Unknown catalog"); return kind; })
  .handler(async ({ data }) => {
    const path = data === "google" ? "/api/public/catalog/google.xml" : "/api/public/catalog/meta.csv";
    try {
      const response = await fetch(`${SITE_URL}${path}`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
      const type = response.headers.get("content-type") ?? "";
      const expected = data === "google" ? "xml" : "csv";
      return { accessible: response.ok && type.includes(expected), status: response.status, checkedAt: new Date().toISOString() };
    } catch { return { accessible: false, status: 0, checkedAt: new Date().toISOString() }; }
  });