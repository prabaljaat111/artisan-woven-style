import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, Truck, RotateCcw, Sparkles, Star } from "lucide-react";
import { products, categories } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";
import { LotusMark } from "@/components/LotusMark";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const featured = products.slice(0, 8);
  const heroProduct = products.find((p) => p.name.toLowerCase().includes("maroon")) ?? products[3];
  const circleCats = [
    { label: "Sale", img: products[5].images[0], to: "/shop" },
    { label: "Sets", img: products[2].images[0], to: "/category/$slug", params: { slug: "kurta-sets" } },
    { label: "Kurtas", img: products[3].images[0], to: "/category/$slug", params: { slug: "kurtis" } },
    { label: "Tops", img: products[11]?.images[0] ?? products[0].images[0], to: "/category/$slug", params: { slug: "tops-tunics" } },
    { label: "Bottoms", img: products[4].images[0], to: "/category/$slug", params: { slug: "pants" } },
    { label: "Inners", img: products[12]?.images[0] ?? products[0].images[0], to: "/category/$slug", params: { slug: "noodle-strap" } },
    { label: "Sarees", img: products[7].images[0], to: "/category/$slug", params: { slug: "sarees" } },
    { label: "Bridal", img: products[13]?.images[0] ?? products[0].images[0], to: "/category/$slug", params: { slug: "kurta-sets" } },
  ];

  return (
    <div>
      {/* Hero — giant NEW COLLECTION overlapping editorial */}
      <section className="relative overflow-hidden bg-secondary/50">
        <div className="relative max-w-7xl mx-auto">
          <div className="relative aspect-[4/5] md:aspect-[16/9] w-full overflow-hidden">
            {/* Background mega type */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center leading-[0.82]">
                <div className="text-primary/90" style={{ fontFamily: "var(--font-mega)", fontSize: "clamp(7rem, 32vw, 22rem)" }}>
                  NEW
                </div>
                <div className="text-primary/90 -mt-[0.18em]" style={{ fontFamily: "var(--font-mega)", fontSize: "clamp(2.4rem, 11vw, 7rem)", letterSpacing: "0.06em" }}>
                  COLLECTION
                </div>
              </div>
            </div>
            {/* Product image floating on top */}
            <motion.img
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              src={heroProduct.images[0]}
              alt={heroProduct.name}
              className="relative z-10 mx-auto h-full w-auto object-contain object-bottom drop-shadow-[0_30px_40px_rgba(0,0,0,0.25)]"
            />
            {/* Cloud base */}
            <div className="absolute bottom-0 inset-x-0 h-16 md:h-24 bg-gradient-to-t from-white to-transparent z-20" />
            {/* Side captions */}
            <div className="absolute left-3 md:left-6 bottom-20 md:bottom-28 z-30 text-[11px] md:text-sm text-accent">
              <div className="font-display italic text-base md:text-2xl">Avika</div>
              <div className="opacity-90">Rayon Mukaish Co-ord Set</div>
            </div>
            <div className="absolute right-3 md:right-6 bottom-20 md:bottom-28 z-30 text-right text-[11px] md:text-sm text-accent">
              <div className="font-display italic">Collection is live</div>
              <div className="font-semibold">Limited Edition</div>
            </div>
            <Link to="/shop" className="absolute left-1/2 -translate-x-1/2 bottom-6 z-30 font-display italic text-base md:text-lg text-primary border-b border-primary pb-0.5">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee sale bar */}
      <div className="bg-background border-y border-border overflow-hidden">
        <div className="flex whitespace-nowrap animate-[scroll_22s_linear_infinite] py-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="font-display text-xl md:text-3xl text-accent px-6">
              Upto 70% Off <span className="text-foreground/40 mx-3">|</span> Limited Time Offer <span className="text-foreground/40 mx-3">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Circular category strip */}
      <section className="bg-background">
        <div className="max-w-7xl mx-auto px-3 py-6 overflow-x-auto">
          <div className="flex gap-5 md:gap-8 min-w-max md:justify-center">
            {circleCats.map((c) => (
              <Link key={c.label} to={c.to as "/shop"} params={c.params as never} className="flex flex-col items-center gap-2 min-w-[72px] group">
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border border-border bg-secondary/60 group-hover:border-primary transition">
                  <img src={c.img} alt={c.label} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-foreground/80">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* View - Shop - Style - Repeat */}
      <section className="bg-background py-8">
        <h2 className="text-center font-display italic text-primary text-2xl md:text-4xl">
          View &nbsp;-&nbsp; Shop &nbsp;-&nbsp; Style &nbsp;-&nbsp; Repeat
        </h2>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">The Atelier</p>
          <h2 className="font-display italic text-3xl md:text-5xl text-primary mt-2">Featured Pieces</h2>
          <div className="gold-underline w-24 mx-auto mt-3" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {featured.map((p) => (
            <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} badge={p.isBestseller ? "Bestseller" : p.isNew ? "New" : undefined} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/shop" className="inline-block border-2 border-primary text-primary px-8 py-3 rounded-full text-sm font-medium tracking-wider uppercase hover:bg-primary hover:text-primary-foreground transition">View All</Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-secondary/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="font-display italic text-2xl md:text-4xl text-primary">Why Choose Us</h2>
            <div className="gold-underline w-20 mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: Sparkles, title: "GI-Certified Craft", desc: "Genuine Lucknow heritage" },
              { icon: ShieldCheck, title: "Authentic Embroidery", desc: "Hand-stitched by artisans" },
              { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" },
              { icon: Truck, title: "Pan-India Delivery", desc: "Cash on Delivery available" },
            ].map((b) => (
              <div key={b.title} className="bg-background border border-border rounded-2xl p-5 text-center">
                <b.icon className="h-7 w-7 text-primary mx-auto" />
                <h3 className="font-display text-base text-primary mt-3">{b.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Loved across India</p>
          <h2 className="font-display italic text-3xl md:text-4xl text-primary mt-2">From Our Customers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: "Priya R.", text: "Pure cotton, incredibly soft. The embroidery is even more beautiful in person.", source: "Amazon" },
            { name: "Anjali M.", text: "Wore the sharara to a wedding — got compliments all night. Perfect fit.", source: "Flipkart" },
            { name: "Meena S.", text: "Genuine Lucknowi quality at a fair price. Will definitely order again.", source: "Amazon" },
          ].map((r) => (
            <div key={r.name} className="bg-background border border-border rounded-2xl p-6">
              <div className="flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-sm text-foreground/85 mt-3 leading-relaxed">"{r.text}"</p>
              <p className="text-xs text-muted-foreground mt-4">— {r.name} · <span className="text-accent">{r.source} customer</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <LotusMark className="h-8 w-8 text-primary-foreground mx-auto mb-3" />
          <h2 className="font-display italic text-2xl md:text-3xl">Join the Atelier List</h2>
          <p className="text-sm opacity-80 mt-2">Early access to drops, artisan stories, and members-only discounts.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" placeholder="your@email.com" className="flex-1 rounded-full px-5 py-3 text-sm text-foreground bg-background" />
            <button className="bg-accent text-accent-foreground font-medium px-6 py-3 rounded-full text-sm hover:opacity-90 transition">Subscribe</button>
          </form>
          <label className="flex items-center justify-center gap-2 text-xs opacity-80 mt-3">
            <input type="checkbox" className="accent-accent" /> Also send me WhatsApp updates
          </label>
        </div>
      </section>
    </div>
  );
}
