import { createFileRoute } from "@tanstack/react-router";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { LandmarkCard } from "@/components/LandmarkCards";

export const Route = createFileRoute("/sale")({
  head: () => ({
    meta: [{ property: "og:title", content: "Sale \u2014 Up to 50% Off Chikankari | Indian Handicraft Standards" }, { property: "og:description", content: "Authentic Lucknowi Chikankari on sale. Hand-embroidered kurtis, sarees and sets at discounted prices." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
      { title: "Sale — Up to 50% Off Chikankari | Indian Handicraft Standards" },
      { name: "description", content: "Authentic Lucknowi Chikankari on sale. Hand-embroidered kurtis, sarees and sets at discounted prices." },
      { property: "og:url", content: "https://indianhandicraftstandards.com/sale" },
    ],
    links: [{ rel: "canonical", href: "https://indianhandicraftstandards.com/sale" }],
  }),
  component: SalePage,
});

function SalePage() {
  const products = useStorefrontProducts();
  const items = products
    .filter((p) => p.originalPrice > p.price)
    .map((p) => ({ ...p, _disc: Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) }))
    .sort((a, b) => b._disc - a._disc);

  return (
    <div className="pb-24 md:pb-10">
      <section className="bg-gradient-to-br from-accent/30 via-secondary to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Limited Time</p>
          <h1 className="font-display text-4xl md:text-5xl text-primary mt-2">Festive Sale</h1>
          <div className="gold-underline w-24 mx-auto mt-4" />
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-xl mx-auto">Up to 50% off on authentic hand-embroidered Chikankari. While stocks last.</p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-xs text-muted-foreground mb-4">{items.length} pieces on sale</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((p) => (
            <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} isDemo={p.isDemo} stock={p.stock} badge={`-${p._disc}%`} />
          ))}
        </div>
      </section>
    </div>
  );
}