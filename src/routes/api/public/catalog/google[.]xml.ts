import { createFileRoute } from "@tanstack/react-router";
import { catalogItems, googleXml } from "@/lib/feed";

export const Route = createFileRoute("/api/public/catalog/google.xml")({
  server: { handlers: { GET: async () => {
    try {
      const { loadFeedRows } = await import("@/lib/feed.server");
      return new Response(googleXml(catalogItems(await loadFeedRows())), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    } catch { return new Response("Catalog temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  } } },
});