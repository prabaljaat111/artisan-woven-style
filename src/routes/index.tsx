import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Truck, RotateCcw, Sparkles, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { products, categories } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";
import { LotusMark } from "@/components/LotusMark";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import hero1 from "@/assets/hero/hero-1.jpg";
import hero2 from "@/assets/hero/hero-2.jpg";
import hero3 from "@/assets/hero/hero-3.jpg";
import hero4 from "@/assets/hero/hero-4.jpg";
import hero5 from "@/assets/hero/hero-5.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { property: "og:url", content: "https://indianhandicraft.revnlabel.in/" },
    ],
    links: [
      { rel: "preload", as: "image", href: hero1, fetchpriority: "high" } as never,
      { rel: "prefetch", as: "image", href: hero2 } as never,
      { rel: "prefetch", as: "image", href: hero3 } as never,
      { rel: "prefetch", as: "image", href: hero4 } as never,
      { rel: "prefetch", as: "image", href: hero5 } as never,
      { rel: "canonical", href: "https://indianhandicraft.revnlabel.in/" },
    ],
  }),
});

const HERO_SLIDES = [
  { img: hero1, kicker: "New Collection", title: "Timeless Ivory", caption: "Hand-embroidered Chikankari classics" },
  { img: hero2, kicker: "Bridal Edit", title: "Maroon & Gold", caption: "Heirloom craftsmanship, modern silhouettes" },
  { img: hero3, kicker: "Summer Edit", title: "Pastel Whispers", caption: "Featherlight cotton, mint freshness" },
  { img: hero4, kicker: "Festive 2026", title: "Blush Anarkali", caption: "Flowing grace with mukaish detail" },
  { img: hero5, kicker: "Limited Edition", title: "Golden Couture", caption: "Regal zardozi for the modern bride" },
];

function HeroSlider() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((p) => (p + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [paused]);
  const slide = HERO_SLIDES[i];
  const go = (dir: number) => setI((p) => (p + dir + HERO_SLIDES.length) % HERO_SLIDES.length);
  return (
    <section
      className="relative w-full h-[72vh] md:h-[92vh] overflow-hidden bg-secondary/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={i}
          src={slide.img}
          alt={slide.title}
          loading="eager"
          decoding="async"
          fetchPriority={i === 0 ? ("high" as const) : ("low" as const)}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      {/* Bottom gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />
      {/* Caption */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`cap-${i}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="absolute inset-x-0 bottom-16 md:bottom-24 text-center text-white px-6"
        >
          <p className="text-[11px] md:text-sm uppercase tracking-[0.35em] opacity-90">{slide.kicker}</p>
          <h1 className="font-display italic text-4xl md:text-7xl mt-3 drop-shadow-lg">{slide.title}</h1>
          <p className="text-sm md:text-base mt-3 opacity-90">{slide.caption}</p>
          <Link to="/shop" className="inline-block mt-5 bg-white text-primary px-7 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wider uppercase hover:bg-accent hover:text-white transition">
            Shop Now
          </Link>
        </motion.div>
      </AnimatePresence>
      {/* Arrows desktop */}
      <button onClick={() => go(-1)} aria-label="Previous" className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/30 backdrop-blur hover:bg-white/60 text-white hover:text-primary items-center justify-center transition">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={() => go(1)} aria-label="Next" className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/30 backdrop-blur hover:bg-white/60 text-white hover:text-primary items-center justify-center transition">
        <ChevronRight className="h-5 w-5" />
      </button>
      {/* Dots */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center gap-2 z-10">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}

function Index() {
  const featured = products.slice(0, 8);
  const [news, setNews] = useState({ email: "", wa: false, sending: false, sent: false });
  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    const email = news.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Please enter a valid email");
    }
    setNews((n) => ({ ...n, sending: true }));
    try {
      const { error } = await supabase.from("leads").insert({
        name: email.split("@")[0].slice(0, 60),
        phone: email,
        whatsapp: null,
        interest: "Newsletter signup",
        page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
        source: news.wa ? "newsletter+whatsapp" : "newsletter",
        status: "new",
        notes: `Email: ${email}\nWantsWhatsApp: ${news.wa}`,
        conversation: [],
      });
      if (error) throw error;
      setNews({ email: "", wa: false, sending: false, sent: true });
      toast.success("You're on the list — welcome 🌸");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't subscribe right now.");
      setNews((n) => ({ ...n, sending: false }));
    }
  }
  const circleCats = [
    { label: "Sale", img: products[5].images[0], to: "/shop" },
    { label: "Kurtis", img: products[0].images[0], to: "/category/$slug", params: { slug: "kurtis" } },
    { label: "Kurta Sets", img: products[2].images[0], to: "/category/$slug", params: { slug: "kurta-sets" } },
    { label: "Suits", img: products[9].images[0], to: "/category/$slug", params: { slug: "unstitched-suits" } },
    { label: "Sarees", img: products[7].images[0], to: "/category/$slug", params: { slug: "sarees" } },
    { label: "Tops", img: products[10]?.images[0] ?? products[0].images[0], to: "/category/$slug", params: { slug: "tops-tunics" } },
    { label: "Bottoms", img: products[12]?.images[0] ?? products[4].images[0], to: "/category/$slug", params: { slug: "pants" } },
    { label: "Inners", img: products[11]?.images[0] ?? products[0].images[0], to: "/category/$slug", params: { slug: "noodle-strap" } },
  ];

  return (
    <div>
      <HeroSlider />

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

      {/* Trust strip */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { icon: ShieldCheck, t: "10,000+", s: "Happy customers" },
            { icon: Sparkles, t: "Since 2015", s: "Heritage brand" },
            { icon: Truck, t: "Worldwide", s: "Shipping" },
            { icon: RotateCcw, t: "Handmade", s: "in Lucknow" },
          ].map((b) => (
            <div key={b.s} className="flex items-center justify-center gap-2.5 py-1.5">
              <b.icon className="h-5 w-5 text-gold shrink-0" />
              <div className="text-left leading-tight">
                <div className="text-sm font-display text-primary">{b.t}</div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{b.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Circular category strip */}
      <section className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-3 py-8 overflow-x-auto">
          <div className="flex gap-5 md:gap-10 min-w-max md:justify-center">
            {circleCats.map((c) => (
              <Link key={c.label} to={c.to as "/shop"} params={c.params as never} className="flex flex-col items-center gap-2.5 min-w-[72px] group">
                <div className="relative h-20 w-20 md:h-[5.5rem] md:w-[5.5rem] rounded-full overflow-hidden bg-secondary/40 ring-1 ring-border group-hover:ring-primary group-hover:shadow-md group-hover:shadow-primary/10 transition-all duration-300">
                  <img src={c.img} alt={c.label} loading="lazy" decoding="async" width={88} height={88} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <span className="text-[11px] md:text-xs font-medium text-foreground/70 group-hover:text-primary transition-colors text-center leading-tight">{c.label}</span>
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
            <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} isDemo={p.isDemo} stock={p.stock} badge={p.isBestseller ? "Bestseller" : p.isNew ? "New" : undefined} />
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
          <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={news.email}
              onChange={(e) => setNews((n) => ({ ...n, email: e.target.value }))}
              maxLength={200}
              placeholder="your@email.com"
              className="flex-1 rounded-full px-5 py-3 text-sm text-foreground bg-background"
            />
            <button disabled={news.sending || news.sent} className="bg-accent text-accent-foreground font-medium px-6 py-3 rounded-full text-sm hover:opacity-90 transition disabled:opacity-60">
              {news.sent ? "✓ Subscribed" : news.sending ? "…" : "Subscribe"}
            </button>
          </form>
          <label className="flex items-center justify-center gap-2 text-xs opacity-80 mt-3">
            <input type="checkbox" checked={news.wa} onChange={(e) => setNews((n) => ({ ...n, wa: e.target.checked }))} className="accent-accent" /> Also send me WhatsApp updates
          </label>
        </div>
      </section>
    </div>
  );
}
