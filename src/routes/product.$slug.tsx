import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Star, MessageCircle, Truck, ShieldCheck, RotateCcw, Share2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { findProduct, products, type Product } from "@/data/products";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useUI } from "@/store/ui";
import { useRecentlyViewed } from "@/store/recently-viewed";
import { LandmarkCard } from "@/components/LandmarkCards";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { checkServiceability } from "@/lib/shiprocket.functions";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  head: ({ loaderData }) => {
    const p = loaderData as Product | undefined;
    if (!p) return { meta: [{ title: "Product — Indian Handicraft Standards" }] };
    const desc = `${p.name} — authentic Lucknowi Chikankari. ₹${p.price}.`;
    const img = p.images?.[0];
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      image: p.images,
      description: desc,
      sku: p.id,
      brand: { "@type": "Brand", name: "Indian Handicraft Standards" },
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: p.price,
        availability: "https://schema.org/InStock",
      },
    };
    return {
      meta: [
        { title: `${p.name} — Indian Handicraft Standards` },
        { name: "description", content: desc },
        { property: "og:title", content: p.name },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: `/product/${p.slug}` }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-primary">Product not found</h1>
      <Link to="/shop" className="text-gold mt-4 inline-block">Browse all →</Link>
    </div>
  ),
  loader: ({ params }): Product => {
    const p = findProduct(params.slug);
    if (!p) throw notFound();
    return p;
  },
});

function ProductPage() {
  const p = Route.useLoaderData();
  const [size, setSize] = useState(p.sizes[1]);
  const [color, setColor] = useState(p.colors[0]);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const addItem = useCart((s) => s.addItem);
  const { ids, toggle } = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const incrementProductView = useUI((s) => s.incrementProductView);
  const addRecent = useRecentlyViewed((s) => s.add);
  const recentIds = useRecentlyViewed((s) => s.ids);
  useEffect(() => {
    incrementProductView();
    addRecent(p.id);
    setImgIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  const wished = mounted && ids.includes(p.id);
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const recent = mounted
    ? recentIds.filter((id) => id !== p.id).map((id) => products.find((x) => x.id === id)).filter(Boolean).slice(0, 4) as Product[]
    : [];

  const savings = Math.max(0, p.originalPrice - p.price);

  // Pincode serviceability
  const [pin, setPin] = useState("");
  const [pinState, setPinState] = useState<{ status: "idle" | "checking" | "ok" | "no" | "err"; etd?: string; msg?: string }>({ status: "idle" });
  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) { setPinState({ status: "idle" }); return; }
    let cancelled = false;
    setPinState({ status: "checking" });
    checkServiceability({ data: { pincode: pin, weight: 0.5, cod: false } })
      .then((r: any) => {
        if (cancelled) return;
        if (r?.serviceable) setPinState({ status: "ok", etd: r?.etd ?? "" });
        else setPinState({ status: "no", msg: "Not serviceable on this PIN." });
      })
      .catch(() => { if (!cancelled) setPinState({ status: "err", msg: "Could not check right now." }); });
    return () => { cancelled = true; };
  }, [pin]);

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title: p.name, text: `${p.name} — Indian Handicraft Standards`, url };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share(data).catch(() => {});
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
    }
  }

  function nextImg() { setImgIdx((i) => (i + 1) % p.images.length); }
  function prevImg() { setImgIdx((i) => (i - 1 + p.images.length) % p.images.length); }

  const handleAdd = () => {
    addItem({ id: p.id, name: p.name, slug: p.slug, price: p.price, image: p.images[0], size, color, qty });
    toast.success(`Added to cart · ${p.name}`, { description: `${size} · ${color} · Qty ${qty}` });
  };
  const handleWishlist = () => {
    toggle(p.id);
    toast(ids.includes(p.id) ? "Removed from wishlist" : "Added to wishlist 🌸");
  };

  return (
    <div className="pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 grid md:grid-cols-2 gap-8 md:gap-14">
        <div>
          <div className="relative aspect-[4/5] bg-secondary rounded-2xl overflow-hidden border border-gold/30">
            <img src={p.images[imgIdx]} alt={p.name} decoding="async" {...({ fetchpriority: "high" } as Record<string, string>)} className="w-full h-full object-cover" />
            {p.images.length > 1 && (
              <>
                <button onClick={prevImg} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-cream/80 hover:bg-cream rounded-full flex items-center justify-center shadow"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={nextImg} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-cream/80 hover:bg-cream rounded-full flex items-center justify-center shadow"><ChevronRight className="h-4 w-4" /></button>
              </>
            )}
            {savings > 0 && (
              <span className="absolute top-3 left-3 bg-terracotta text-cream text-[11px] font-semibold px-2 py-1 rounded">Save ₹{savings.toLocaleString("en-IN")}</span>
            )}
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {p.images.map((src: string, i: number) => (
              <button key={i} onClick={() => setImgIdx(i)} className={cn("h-20 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2", i === imgIdx ? "border-gold" : "border-border")}>
                <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{p.category}</p>
            <button onClick={handleShare} aria-label="Share" className="text-muted-foreground hover:text-primary p-1.5 -m-1.5"><Share2 className="h-4 w-4" /></button>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-primary mt-2">{p.name}</h1>
          {p.isDemo && (
            <p className="mt-2 inline-block text-[10px] uppercase tracking-[0.2em] bg-secondary/70 border border-border text-foreground/70 px-2 py-1 rounded">
              Sample product · For preview only
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-gold text-gold" /> {p.rating.toFixed(1)} ({p.reviews} reviews)
          </div>
          <div className="flex items-baseline gap-3 mt-4 flex-wrap">
            <span className="font-display text-3xl text-primary">₹{p.price.toLocaleString("en-IN")}</span>
            <span className="line-through text-muted-foreground">₹{p.originalPrice.toLocaleString("en-IN")}</span>
            <span className="bg-gold text-primary text-xs font-bold px-2 py-1 rounded">{Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF</span>
          </div>
          {savings > 0 && <p className="text-xs text-terracotta mt-1">You save ₹{savings.toLocaleString("en-IN")}</p>}
          <p className="text-[11px] text-terracotta mt-2">🔥 24 people viewed this in the last hour</p>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Size</span><Link to="/size-guide" className="text-xs text-gold underline">Size Guide</Link></div>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s: string) => (<button key={s} onClick={() => setSize(s)} className={cn("min-w-[44px] h-11 px-3 border rounded-md text-sm", size === s ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{s}</button>))}
            </div>
          </div>
          <div className="mt-5">
            <span className="text-sm font-medium block mb-2">Color: <span className="text-muted-foreground">{color}</span></span>
            <div className="flex flex-wrap gap-2">
              {p.colors.map((c: string) => (<button key={c} onClick={() => setColor(c)} className={cn("h-11 px-4 border rounded-md text-sm", color === c ? "bg-secondary border-primary" : "border-border")}>{c}</button>))}
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-medium">Qty</span>
            <div className="flex items-center border border-border rounded-md">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10">−</button>
              <span className="w-10 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="h-10 w-10">+</button>
            </div>
          </div>
          <div className="hidden md:flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90">Add to Cart</button>
            <Link to="/checkout" onClick={handleAdd} className="flex-1 bg-gold text-primary text-center py-3 rounded-full font-medium hover:opacity-90">Buy Now</Link>
            <button onClick={handleWishlist} aria-label="Wishlist" className="h-12 w-12 border border-border rounded-full flex items-center justify-center"><Heart className={cn("h-5 w-5", wished && "fill-primary text-primary")} /></button>
          </div>
          {/* Pincode serviceability */}
          <div className="mt-5 border border-border rounded-lg p-3 bg-secondary/30">
            <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-gold" /> Check delivery to your PIN</label>
            <div className="flex gap-2 mt-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="6-digit PIN"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-gold"
              />
            </div>
            {pinState.status === "checking" && <p className="text-xs text-muted-foreground mt-2">Checking…</p>}
            {pinState.status === "ok" && <p className="text-xs text-green-700 mt-2 flex items-center gap-1"><Check className="h-3 w-3" /> Delivers here{pinState.etd ? ` · ${pinState.etd}` : ""}</p>}
            {pinState.status === "no" && <p className="text-xs text-red-600 mt-2">{pinState.msg}</p>}
            {pinState.status === "err" && <p className="text-xs text-muted-foreground mt-2">{pinState.msg}</p>}
          </div>
          <a href={`https://wa.me/919044466957?text=${encodeURIComponent(`Hi! I'd like to know more about ${p.name}`)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[#25D366] font-medium">
            <MessageCircle className="h-4 w-4" /> Ask about this product on WhatsApp
          </a>
          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            {[{ icon: Truck, label: "Free shipping ₹999+" },{ icon: RotateCcw, label: "7-day returns" },{ icon: ShieldCheck, label: "Authentic craft" }].map((b) => (
              <div key={b.label} className="bg-secondary/50 rounded-lg p-3"><b.icon className="h-4 w-4 text-gold mx-auto" /><p className="text-[11px] mt-1 text-muted-foreground leading-tight">{b.label}</p></div>
            ))}
          </div>
          <div className="mt-8"><h2 className="font-display text-lg text-primary mb-2">Description</h2><p className="text-sm text-foreground/85 leading-relaxed">{p.description}</p></div>
          <p className="text-[11px] text-muted-foreground italic mt-2">Handmade in Lucknow — slight variation in colour and embroidery placement is the signature of true Chikankari.</p>
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="fabric"><AccordionTrigger>Fabric & Care</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">Premium cotton / georgette. Gentle hand wash separately in cold water. Dry in shade. Iron on reverse.</AccordionContent></AccordionItem>
            <AccordionItem value="ship"><AccordionTrigger>Shipping & Returns</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">Ships in 2–4 business days. Free shipping above ₹999. 7-day easy returns on unworn items.</AccordionContent></AccordionItem>
            <AccordionItem value="auth"><AccordionTrigger>Authenticity</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">Every piece is hand-embroidered by master artisans from Lucknow. Sourced directly with fair wages.</AccordionContent></AccordionItem>
          </Accordion>
        </div>
      </div>
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-display text-2xl md:text-3xl text-primary text-center mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((r) => (<LandmarkCard key={r.id} id={r.id} slug={r.slug} title={r.name} price={r.price} originalPrice={r.originalPrice} image={r.images[0]} shape={r.cardShape} isDemo={r.isDemo} />))}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-display text-2xl md:text-3xl text-primary text-center mb-8">Recently Viewed</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {recent.map((r) => (<LandmarkCard key={r.id} id={r.id} slug={r.slug} title={r.name} price={r.price} originalPrice={r.originalPrice} image={r.images[0]} shape={r.cardShape} isDemo={r.isDemo} />))}
          </div>
        </section>
      )}
      <div className="md:hidden fixed bottom-14 inset-x-0 z-30 bg-cream border-t border-border p-3 flex gap-2 items-center">
        <button onClick={handleWishlist} aria-label="Wishlist" className="h-11 w-11 border border-border rounded-full flex items-center justify-center shrink-0"><Heart className={cn("h-5 w-5", wished && "fill-primary text-primary")} /></button>
        <button onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium">Add to Cart</button>
        <Link to="/checkout" onClick={handleAdd} className="flex-1 bg-gold text-primary text-center py-3 rounded-full text-sm font-medium">Buy Now</Link>
      </div>
    </div>
  );
}