import { createFileRoute } from "@tanstack/react-router";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { LandmarkCard } from "@/components/LandmarkCards";

export const Route = createFileRoute("/whats-new")({
  head: () => ({
    meta: [
      { title: "What's New — Fresh Chikankari Arrivals | Indian Handicraft Standards" },
      { name: "description", content: "The newest hand-embroidered Lucknowi Chikankari arrivals — fresh kurtis, sarees, and festive sets." },
      { property: "og:url", content: "https://indianhandicraft.revnlabel.in/whats-new" },
    ],
    links: [{ rel: "canonical", href: "https://indianhandicraft.revnlabel.in/whats-new" }],
  }),
  component: WhatsNewPage,
});

function WhatsNewPage() {
  const products = useStorefrontProducts();
  const items = products.filter((p) => p.isNew);
  const fallback = items.length ? items : products.slice(0, 12);

  return (
    <div className="pb-24 md:pb-10">
      <section className="bg-secondary/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Fresh off the loom</p>
          <h1 className="font-display text-4xl md:text-5xl text-primary mt-2">What's New</h1>
          <div className="gold-underline w-24 mx-auto mt-4" />
          <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">The latest hand-embroidered arrivals from our karigars in Lucknow.</p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {fallback.map((p) => (
            <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} isDemo={p.isDemo} stock={p.stock} badge="New" />
          ))}
        </div>
      </section>
    </div>
  );
}