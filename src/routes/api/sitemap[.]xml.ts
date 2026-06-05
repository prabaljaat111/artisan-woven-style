import { createFileRoute } from "@tanstack/react-router";
import { products, categories } from "@/data/products";

const BASE = "https://indianhandicraft.revnlabel.in";

const STATIC_PATHS = [
  "/", "/shop", "/sale", "/whats-new", "/watch-and-buy",
  "/category", "/about", "/contact", "/faq",
  "/shipping", "/returns", "/privacy", "/terms",
  "/size-guide", "/track-order",
];

export const Route = createFileRoute("/api/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: string[] = [];
        for (const p of STATIC_PATHS) urls.push(`${BASE}${p}`);
        for (const c of categories) urls.push(`${BASE}/category/${c.slug}`);
        for (const p of products) urls.push(`${BASE}/product/${p.slug}`);
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>`;
        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});