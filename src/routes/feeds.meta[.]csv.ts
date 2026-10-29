import { createFileRoute } from "@tanstack/react-router";
import { metaCsv, catalogItems } from "@/lib/feed";

export const Route = createFileRoute("/feeds/meta.csv")({
  server: {
    handlers: {
      GET: async () => {
        const { loadFeedRows } = await import("@/lib/feed.server");
        const rows = await loadFeedRows();
        return new Response(metaCsv(catalogItems(rows)), {
          headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=60" },
        });
      },
    },
  },
});
