import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWishlist } from "@/store/wishlist";
import { products } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Your Wishlist — Indian Handicraft Standards" }, { name: "description", content: "Pieces you've saved for later." }, { name: "robots", content: "noindex,nofollow" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const ids = useWishlist((s) => s.ids);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const items = mounted ? products.filter((p) => ids.includes(p.id)) : [];
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl md:text-4xl text-primary text-center">Your Wishlist</h1>
      <div className="gold-underline w-20 mx-auto mt-3 mb-8" />
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No saved pieces yet.</p>
          <Link to="/shop" className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm">Browse Collection</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {items.map((p) => (<LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} isDemo={p.isDemo} />))}
        </div>
      )}
    </div>
  );
}