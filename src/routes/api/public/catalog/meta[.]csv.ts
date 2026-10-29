import { createFileRoute } from "@tanstack/react-router";
import { catalogItems, metaCsv } from "@/lib/feed";

export const Route = createFileRoute("/api/public/catalog/meta.csv")({
  server: { handlers: { GET: async () => {
    try {
      const { loadFeedRows } = await import("@/lib/feed.server");
      return new Response(metaCsv(catalogItems(await loadFeedRows())), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    } catch { return new Response("Catalog temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  } } },
});