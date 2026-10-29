import { createFileRoute } from "@tanstack/react-router";
import { googleXml, catalogItems } from "@/lib/feed";

export const Route = createFileRoute("/feeds/google.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { loadFeedRows } = await import("@/lib/feed.server");
        const rows = await loadFeedRows();
        return new Response(googleXml(catalogItems(rows)), {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=60" },
        });
      },
    },
  },
});
