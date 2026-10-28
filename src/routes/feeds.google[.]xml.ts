import { createFileRoute } from "@tanstack/react-router";
import { googleXml, toFeedItem } from "@/lib/feed";

export const Route = createFileRoute("/feeds/google.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { loadFeedRows } = await import("@/lib/feed.server");
        const rows = await loadFeedRows();
        return new Response(googleXml(rows.map(toFeedItem)), {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
        });
      },
    },
  },
});
