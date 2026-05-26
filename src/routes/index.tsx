import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheck, Truck, RotateCcw, Sparkles, Star } from "lucide-react";
import { products, categories } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";
import { LotusMark } from "@/components/LotusMark";

export const Route = createFileRoute("/")({ component: Index });

const slides = [
  { title: "Hand-Embroidered Since 2015", subtitle: "Now Back & Better", cta: "Shop New Arrivals" },
  { title: "10,000+ Happy Customers", subtitle: "On Amazon & Flipkart", cta: "Read Reviews" },
  { title: "Authentic Lucknowi Chikankari", subtitle: "Direct from the source", cta: "Explore Collection" },
];

function Index() {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);
  const featured = products.slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream via-secondary/40 to-cream">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-24 grid md:grid-cols-2 gap-8 items-center">
          <div className="text-center md:text-left">
            <motion.div key={slide} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold mb-4">
                <LotusMark className="h-4 w-4" /> Authenticity woven in every thread
              </div>
              <h1 className="font-display text-4xl md:text-6xl text-primary leading-[1.05]">
                {slides[slide].title}
              </h1>
              <p className="font-display italic text-lg md:text-2xl text-terracotta mt-2">{slides[slide].subtitle}</p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-6">
                <Link to="/shop" className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition">{slides[slide].cta}</Link>
                <Link to="/about" className="border border-primary text-primary px-6 py-3 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition">Our Story</Link>
              </div>
              <div className="flex gap-2 justify-center md:justify-start mt-8">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? "bg-primary w-8" : "bg-border w-3"}`} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </motion.div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-6 px-4">
            {featured.slice(0, 2).map((p) => (
              <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape="taj" badge={p.isBestseller ? "Bestseller" : undefined} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories scroll strip */}
      <section className="border-y border-border bg-cream">
        <div className="max-w-7xl mx-auto px-4 py-5 overflow-x-auto">
          <div className="flex gap-3 md:gap-4 min-w-max md:justify-center">
            {categories.slice(0, 10).map((c) => (
              <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="flex flex-col items-center gap-2 min-w-[80px] group">
                <div className="h-14 w-14 rounded-full bg-secondary border border-gold/40 flex items-center justify-center group-hover:bg-gold/20 transition">
                  <LotusMark className="h-6 w-6 text-gold" />
                </div>
                <span className="text-[11px] text-center text-foreground/80 max-w-[90px] leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">The Atelier</p>
          <h2 className="font-display text-3xl md:text-5xl text-primary mt-2">Featured Pieces</h2>
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
      <section className="bg-secondary/60 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-4xl text-primary">Why Choose Us</h2>
            <div className="gold-underline w-20 mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: Sparkles, title: "GI-Certified Craft", desc: "Genuine Lucknow heritage" },
              { icon: ShieldCheck, title: "Authentic Embroidery", desc: "Hand-stitched by artisans" },
              { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" },
              { icon: Truck, title: "Pan-India Delivery", desc: "Cash on Delivery available" },
            ].map((b) => (
              <div key={b.title} className="bg-cream border border-border rounded-2xl p-5 text-center">
                <b.icon className="h-7 w-7 text-gold mx-auto" />
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
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Loved across India</p>
          <h2 className="font-display text-3xl md:text-4xl text-primary mt-2">From Our Customers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: "Priya R.", text: "Pure cotton, incredibly soft. The embroidery is even more beautiful in person.", source: "Amazon" },
            { name: "Anjali M.", text: "Wore the sharara to a wedding — got compliments all night. Perfect fit.", source: "Flipkart" },
            { name: "Meena S.", text: "Genuine Lucknowi quality at a fair price. Will definitely order again.", source: "Amazon" },
          ].map((r) => (
            <div key={r.name} className="bg-cream border border-border rounded-2xl p-6">
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-sm text-foreground/85 mt-3 leading-relaxed">"{r.text}"</p>
              <p className="text-xs text-muted-foreground mt-4">— {r.name} · <span className="text-gold">{r.source} customer</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <LotusMark className="h-8 w-8 text-gold mx-auto mb-3" />
          <h2 className="font-display text-2xl md:text-3xl">Join the Atelier List</h2>
          <p className="text-sm opacity-80 mt-2">Early access to drops, artisan stories, and members-only discounts.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" placeholder="your@email.com" className="flex-1 rounded-full px-5 py-3 text-sm text-foreground bg-cream" />
            <button className="bg-gold text-primary font-medium px-6 py-3 rounded-full text-sm hover:opacity-90 transition">Subscribe</button>
          </form>
          <label className="flex items-center justify-center gap-2 text-xs opacity-80 mt-3">
            <input type="checkbox" className="accent-gold" /> Also send me WhatsApp updates
          </label>
        </div>
      </section>
    </div>
  );
}
