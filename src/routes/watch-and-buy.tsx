import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { Play, ShoppingBag, Heart } from "lucide-react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { toast } from "sonner";

export const Route = createFileRoute("/watch-and-buy")({
  head: () => ({
    meta: [
      { title: "Watch & Buy — Shoppable Chikankari Reels | Indian Handicraft Standards" },
      { name: "description", content: "Tap through styled looks of hand-embroidered Chikankari and shop straight from the reel." },
      { property: "og:url", content: "https://indianhandicraft.revnlabel.in/watch-and-buy" },
    ],
    links: [{ rel: "canonical", href: "https://indianhandicraft.revnlabel.in/watch-and-buy" }],
  }),
  component: WatchAndBuy,
});

function WatchAndBuy() {
  const products = useStorefrontProducts();
  const reels = products.filter((p) => p.isBestseller || p.isNew).slice(0, 8);
  const all = reels.length ? reels : products.slice(0, 8);
  const [active, setActive] = useState(0);
  const product = all[active];

  const addItem = useCart((s) => s.addItem);
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(product.id);

  return (
    <div className="pb-24 md:pb-10">
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Shoppable looks</p>
          <h1 className="font-display text-3xl md:text-5xl mt-2">Watch & Buy</h1>
          <p className="text-sm text-primary-foreground/80 mt-3 max-w-lg mx-auto">Browse styled looks and add to cart in one tap.</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6 items-start">
        <div className="relative rounded-2xl overflow-hidden bg-secondary aspect-[3/4] max-h-[70vh] mx-auto w-full">
          <img src={product.images[0]} alt={product.name} decoding="async" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1 text-xs font-medium text-primary">
            <Play className="h-3 w-3 fill-primary" /> Reel {active + 1}/{all.length}
          </div>
          <button
            onClick={() => { toggle(product.id); toast(wished ? "Removed from wishlist" : "Added to wishlist 🌸"); }}
            className="absolute top-3 right-3 h-10 w-10 rounded-full bg-background/95 flex items-center justify-center shadow"
            aria-label="Wishlist"
          >
            <Heart className={wished ? "h-5 w-5 fill-accent text-accent" : "h-5 w-5 text-foreground"} />
          </button>
          <div className="absolute bottom-3 inset-x-3 text-white">
            <p className="text-xs uppercase tracking-wider opacity-80">{product.category.replace(/-/g, " ")}</p>
            <h2 className="font-display text-lg leading-tight mt-1">{product.name}</h2>
            <p className="mt-1 text-sm"><span className="font-bold">₹{product.price}</span> <span className="line-through opacity-70 text-xs ml-1">₹{product.originalPrice}</span></p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => { addItem({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.images[0], size: product.sizes[2], color: product.colors[0], qty: 1 }); toast("Added to cart 🛍️"); }}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-3 text-sm font-medium hover:bg-primary/90 transition"
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </button>
            <Link to="/product/$slug" params={{ slug: product.slug }} className="inline-flex items-center justify-center px-4 rounded-md border border-input text-sm font-medium hover:bg-accent">
              View
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            {all.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActive(i)}
                className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition ${i === active ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"}`}
                aria-label={`Show ${p.name}`}
              >
                <img src={p.images[0]} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center pt-1">Tap a thumbnail to switch the look.</p>
        </div>
      </section>
    </div>
  );
}