import { createFileRoute } from "@tanstack/react-router";
import { products, categories } from "@/data/products";

const BASE_URL = "https://indianhandicraft.revnlabel.in";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/shop", changefreq: "daily", priority: "0.9" },
          { path: "/sale", changefreq: "daily", priority: "0.8" },
          { path: "/whats-new", changefreq: "daily", priority: "0.8" },
          { path: "/watch-and-buy", changefreq: "weekly", priority: "0.7" },
          { path: "/category", changefreq: "weekly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/faq", changefreq: "monthly", priority: "0.5" },
          { path: "/shipping", changefreq: "yearly", priority: "0.3" },
          { path: "/returns", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/size-guide", changefreq: "yearly", priority: "0.3" },
          { path: "/track-order", changefreq: "yearly", priority: "0.3" },
        ];

        for (const c of categories) entries.push({ path: `/category/${c.slug}`, changefreq: "weekly", priority: "0.8" });
        for (const p of products) entries.push({ path: `/product/${p.slug}`, changefreq: "weekly", priority: "0.7" });

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
