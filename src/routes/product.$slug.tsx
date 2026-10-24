import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Star, MessageCircle, Truck, ShieldCheck, RotateCcw, Share2, ChevronLeft, ChevronRight, Check, Ruler, Banknote, PackageCheck, Zap, Globe2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SizeGuideDialog } from "@/components/product/SizeGuideDialog";
import { findProduct, type Product } from "@/data/products";
import { buildProductDetailSections } from "@/lib/product-details";
import { listPublishedProducts } from "@/lib/storefront.functions";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useUI } from "@/store/ui";
import { useRecentlyViewed } from "@/store/recently-viewed";
import { LandmarkCard } from "@/components/LandmarkCards";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { checkServiceability } from "@/lib/shiprocket.functions";
import { getProductVariantsByProductId } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

// Pan-India delivery date estimator. Dispatch in 1 business day, then add
// transit days (skipping Sundays). Returns "Mon, 16 Jun" style label.
function estimateDeliveryLabel(transitDays: number): string {
  const d = new Date();
  let added = 0;
  const target = Math.max(2, transitDays + 1); // +1 dispatch day
  while (added < target) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const COLOR_HEX: Record<string, string> = {
  white: "#ffffff", ivory: "#f5efe0", cream: "#f4ead5", beige: "#e8d9b8",
  black: "#1a1a1a", maroon: "#7b1e2b", red: "#c0392b", pink: "#f4a9b8",
  "pastel pink": "#f9c9d2", "off-white": "#f7f3ea",
  gold: "#caa14a", yellow: "#f1c33d",
  green: "#3a7d44", sage: "#a8b89d", mint: "#bfe3c8", "pastel mint": "#cfe9d4",
  blue: "#2f5d8c", turquoise: "#34a3a3", lavender: "#b6a3c9",
  peach: "#f7b791", brown: "#7a4a2b", grey: "#8a8a8a", silver: "#cfcfcf",
};
function colorToHex(name: string): string {
  const k = (name || "").trim().toLowerCase();
  if (COLOR_HEX[k]) return COLOR_HEX[k];
  // Try to match a known colour word inside multi-word names like "Stone Beige"
  // or "Powder Blue" before falling back to a neutral swatch.
  const keys = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (k.includes(key)) return COLOR_HEX[key];
  }
  // Neutral beige fallback — never random purple for unknown names.
  return "#d9c9ad";
}

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  head: ({ loaderData }) => {
    const p = loaderData as Product | undefined;
    if (!p) return { meta: [{ name: "twitter:card", content: "summary" }, { title: "Product — Indian Handicraft Standards" }] };
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
    const url = `https://indianhandicraftstandards.com/product/${p.slug}`;
    return {
      meta: [
        { title: `${p.name} — Indian Handicraft Standards` },
        { name: "description", content: desc },
        { property: "og:title", content: p.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(img && /^https:\/\//.test(img) ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-primary">Product not found</h1>
      <Link to="/shop" className="text-gold mt-4 inline-block">Browse all →</Link>
    </div>
  ),
  loader: async ({ params }): Promise<Product> => {
    // Prefer admin-managed DB products; fall back to the static demo catalogue.
    try {
      const list = await listPublishedProducts();
      const dbHit = list.find((p) => p.slug === params.slug);
      if (dbHit) return dbHit;
    } catch {
      // Network/DB hiccup — fall back silently so the page can still render.
    }
    const p = findProduct(params.slug);
    if (!p) throw notFound();
    return p;
  },
});

function ProductPage() {
  const loaded = Route.useLoaderData() as Product | undefined;
  if (!loaded) throw notFound();
  const all = useStorefrontProducts();
  // Prefer live-synced product so realtime edits reflect in the PDP body.
  const p = all.find((x) => x.slug === loaded.slug) ?? loaded;
  // Ensure full expanded size scale for the selector even when DB has fewer entries.
  const ALL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const sizes = useMemo(() => {
    const set = new Set<string>(p.sizes ?? []);
    if (set.size === 0) return ALL_SIZES;
    return [...ALL_SIZES.filter((s) => set.has(s)), ...(p.sizes ?? []).filter((s: string) => !ALL_SIZES.includes(s))];
  }, [p.sizes]);
  const [size, setSize] = useState(sizes[1] ?? sizes[0]);
  const [color, setColor] = useState(p.colors[0]);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number; on: boolean }>({ x: 50, y: 50, on: false });
  const touchStartX = useRef<number | null>(null);
  const addItem = useCart((s) => s.addItem);
  const { ids, toggle } = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const incrementProductView = useUI((s) => s.incrementProductView);
  const addRecent = useRecentlyViewed((s) => s.add);
  const recentIds = useRecentlyViewed((s) => s.ids);
  // Per-size stock from DB (variants). If a product has no variants, the
  // size selector falls back to the product-level demo stock so the UX
  // still indicates low stock / out of stock.
  const [variantMap, setVariantMap] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchVariants = () => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)) {
        setVariantMap(null);
        return;
      }
      getProductVariantsByProductId({ data: { productId: p.id } })
        .then((rows: Array<{ size: string; stock: number }>) => {
          if (cancelled) return;
          if (!rows.length) { setVariantMap(null); return; }
          const m: Record<string, number> = {};
          rows.forEach((r) => { m[r.size] = (m[r.size] ?? 0) + r.stock; });
          setVariantMap(m);
        })
        .catch(() => { if (!cancelled) setVariantMap(null); });
    };
    fetchVariants();
    // Live-sync: refetch when any variant or this product changes in DB
    const channel = supabase
      .channel(`pdp-${p.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants" }, fetchVariants)
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `id=eq.${p.id}` }, fetchVariants)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [p.id]);
  const sizeStock = (s: string): number => {
    // If inventory isn't tracked, every size is always purchasable.
    if (p.trackInventory === false) return 999;
    if (variantMap) return variantMap[s] ?? 0;
    // Deterministic fallback per size for demo products
    if (p.stock <= 0) return 0;
    const idx = p.sizes.indexOf(s);
    const seed = [1, 0.6, 0.2, 0.05, 0.1, 0.3][idx % 6] ?? 0.2;
    return Math.max(0, Math.round(p.stock * seed));
  };
  const selectedStock = sizeStock(size);
  useEffect(() => {
    incrementProductView();
    addRecent(p.id);
    setImgIdx(0);
    setSize(sizes[1] ?? sizes[0] ?? "");
    setColor(p.colors[0] ?? "");
    setQty(1);
    setVariantMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  const wished = mounted && ids.includes(p.id);
  const related = all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const recent = mounted
    ? recentIds.filter((id) => id !== p.id).map((id) => all.find((x) => x.id === id)).filter(Boolean).slice(0, 4) as Product[]
    : [];

  const savings = Math.max(0, p.originalPrice - p.price);

  // Pincode serviceability
  const [pin, setPin] = useState("");
  const [pinState, setPinState] = useState<{ status: "idle" | "checking" | "ok" | "err"; etd?: string; days?: number; msg?: string }>({ status: "idle" });
  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) { setPinState({ status: "idle" }); return; }
    let cancelled = false;
    setPinState({ status: "checking" });
    checkServiceability({ data: { delivery_postcode: pin, cod: false } })
      .then((r) => {
        if (cancelled) return;
        // Pan-India: always treat as deliverable. Use courier estimate when available,
        // otherwise fall back to a sensible default (5 business days).
        const days = Number(r?.cheapest?.days || r?.fastest?.days || 5) || 5;
        setPinState({ status: "ok", days, etd: estimateDeliveryLabel(days) });
      })
      .catch(() => {
        if (cancelled) return;
        setPinState({ status: "ok", days: 5, etd: estimateDeliveryLabel(5) });
      });
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

  // Color-aware gallery: when a product has multiple images, prefer ones whose
  // URL contains the selected colour name. Falls back to the full image set.
  const gallery = useMemo(() => {
    if (!p.images?.length) return [];
    if (!color || p.images.length < 2) return p.images;
    const tag = color.toLowerCase().replace(/[^a-z]+/g, "-");
    const matched = p.images.filter((src: string) => src.toLowerCase().includes(tag));
    return matched.length ? matched : p.images;
  }, [p.images, color]);
  const details = useMemo(() => buildProductDetailSections(p, color), [p, color]);
  useEffect(() => { setImgIdx(0); }, [color]);
  function nextImg() { setImgIdx((i) => (i + 1) % gallery.length); }
  function prevImg() { setImgIdx((i) => (i - 1 + gallery.length) % gallery.length); }

  const handleAdd = () => {
    if (selectedStock <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }
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
          <div
            className="relative aspect-[4/5] bg-secondary rounded-2xl overflow-hidden border border-gold/30 group cursor-zoom-in"
            onMouseMove={(e) => {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 40) (dx < 0 ? nextImg : prevImg)();
              touchStartX.current = null;
            }}
          >
            <img
              src={gallery[imgIdx]}
              alt={p.name}
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover transition-transform duration-200"
              style={zoom.on ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
            {gallery.length > 1 && (
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
            {gallery.map((src: string, i: number) => (
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
          <div className="mt-3">
            {p.trackInventory === false ? (
              <span className="inline-flex items-center gap-1.5 bg-green-600/10 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Check className="h-3 w-3" /> Made to order · ships in 5–7 days
              </span>
            ) : p.stock <= 0 ? (
              <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Out of Stock
              </span>
            ) : p.stock <= (p.lowStockThreshold ?? 10) ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Only {p.stock} left — order soon
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-green-600/10 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Check className="h-3 w-3" /> In Stock · ships in 2–4 days
              </span>
            )}
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Size <span className="text-muted-foreground font-normal">· {size}</span></span>
              <SizeGuideDialog trigger={<button type="button" className="text-xs text-gold underline inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> Size Guide</button>} />
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s: string) => {
                const st = sizeStock(s);
                const out = st <= 0;
                return (
                  <button
                    key={s}
                    onClick={() => !out && setSize(s)}
                    disabled={out}
                    aria-label={out ? `${s} — out of stock` : s}
                    className={cn(
                      "min-w-[44px] h-11 px-3 border rounded-md text-sm relative transition",
                      size === s && !out ? "bg-primary text-primary-foreground border-primary" : "border-border",
                      out && "opacity-50 line-through cursor-not-allowed bg-muted",
                    )}
                  >
                    {s}
                    {!out && st > 0 && st <= 3 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-bold rounded-full px-1">{st}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs h-4">
              {selectedStock <= 0 ? (
                <span className="text-red-600 font-medium">Size {size}: Out of Stock</span>
              ) : selectedStock <= 10 ? (
                <span className="text-amber-600 font-medium">Size {size}: Only {selectedStock} left</span>
              ) : (
                <span className="text-green-700">Size {size}: In stock</span>
              )}
            </p>
          </div>
          <div className="mt-5">
            <span className="text-sm font-medium block mb-2">Color: <span className="text-muted-foreground">{color}</span></span>
            <div className="flex flex-wrap gap-3 items-center">
              {p.colors.map((c: string) => {
                const hex = colorToHex(c);
                const active = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    aria-label={`Select color ${c}`}
                    className={cn(
                      "relative h-10 w-10 rounded-full border-2 transition shadow-sm",
                      active ? "border-primary ring-2 ring-gold/60 ring-offset-2 ring-offset-background" : "border-border hover:border-primary/50",
                    )}
                    style={{ background: hex }}
                  >
                    {active && <Check className="h-4 w-4 absolute inset-0 m-auto text-white drop-shadow" />}
                  </button>
                );
              })}
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
            <button disabled={selectedStock <= 0} onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">{selectedStock <= 0 ? "Out of Stock" : "Add to Cart"}</button>
            {selectedStock > 0 && <Link to="/checkout" onClick={handleAdd} className="flex-1 bg-gold text-primary text-center py-3 rounded-full font-medium hover:opacity-90">Buy Now</Link>}
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
            {pinState.status === "ok" && (
              <div className="text-xs text-green-700 mt-2 space-y-0.5">
                <p className="flex items-center gap-1 font-medium"><Check className="h-3 w-3" /> Delivers to {pin} · Pan-India shipping</p>
                {pinState.etd && <p className="text-foreground/70">Estimated delivery by <span className="font-semibold text-primary">{pinState.etd}</span>{pinState.days ? ` (≈ ${pinState.days} day${pinState.days > 1 ? "s" : ""})` : ""}</p>}
              </div>
            )}
            {pinState.status === "err" && <p className="text-xs text-muted-foreground mt-2">{pinState.msg}</p>}
          </div>
          <a href={`https://wa.me/919044466957?text=${encodeURIComponent(`Hi! I'd like to know more about ${p.name}`)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[#25D366] font-medium">
            <MessageCircle className="h-4 w-4" /> Ask about this product on WhatsApp
          </a>
          {/* Delivery & service info — artisanal boutique */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[
              { icon: Truck, t: "Delivery", d: "3–5 business days across India" },
              { icon: PackageCheck, t: "Dispatch", d: "Ships within 24–48 hours" },
              { icon: Banknote, t: "COD Available", d: "Cash on delivery on most PINs" },
              { icon: Globe2, t: "International", d: "Worldwide shipping on request" },
            ].map((x) => (
              <div
                key={x.t}
                className="group relative p-5 bg-background border border-gold/30 hover:border-gold rounded-sm transition-all duration-500"
                style={{ boxShadow: "4px 4px 0 0 color-mix(in oklab, var(--gold) 14%, transparent)" }}
              >
                <div className="flex items-start gap-3">
                  <x.icon className="h-5 w-5 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h3 className="font-display text-primary font-semibold text-lg leading-tight">{x.t}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{x.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust icons (5) — artisanal boutique */}
          <div className="mt-8 pt-8 border-t border-gold/20">
            <div className="flex justify-between items-start gap-2">
              {[
                { icon: ShieldCheck, label: "Secure Payments" },
                { icon: Banknote, label: "COD Available" },
                { icon: Truck, label: "Free Shipping" },
                { icon: RotateCcw, label: "Easy Returns" },
                { icon: Zap, label: "Fast Delivery" },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center group w-1/5 px-1">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mb-2 sm:mb-3 flex items-center justify-center bg-primary rounded-full group-hover:bg-gold transition-colors duration-300 shadow-md">
                    <b.icon className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 text-primary-foreground" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.12em] sm:tracking-widest text-primary text-center font-semibold leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mt-8"><h2 className="font-display text-lg text-primary mb-2">Description</h2><p className="text-sm text-foreground/85 leading-relaxed">{p.description}</p></div>
          <p className="text-[11px] text-muted-foreground italic mt-2">Handmade in Lucknow — slight variation in colour and embroidery placement is the signature of true Chikankari.</p>

          {/* Expandable product info */}
          <Accordion type="single" collapsible defaultValue="specs" className="mt-6">
            <AccordionItem value="specs">
              <AccordionTrigger>Specifications</AccordionTrigger>
              <AccordionContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 text-sm">
                  {details.specifications.map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-4 border-b border-border/60 py-3"
                    >
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{k}</dt>
                      <dd className="text-foreground font-medium leading-snug break-words">{v}</dd>
                    </div>
                  ))}
                  {details.attributes.map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-4 border-b border-border/60 py-3"
                    >
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{k}</dt>
                      <dd className="text-foreground font-medium leading-snug break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ship">
              <AccordionTrigger>Shipping Information</AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/80 space-y-1">
                {(details.shippingInfo.length > 0 ? details.shippingInfo : ["Delivered in 3–5 business days across India.", "Free shipping on orders above ₹999.", "Cash on Delivery available on most pincodes.", "Dispatched within 24–48 hours of order confirmation.", "International shipping available on request via WhatsApp."]).map((item) => (
                  <p key={item}>· {item}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>Return Policy</AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/80 space-y-1">
                {(details.returnPolicy.length > 0 ? details.returnPolicy : ["7-day easy returns on unworn, unwashed items with original tags.", "Refund processed within 5–7 business days after pickup.", "Sale and customised pieces are non-returnable."]).map((item) => (
                  <p key={item}>· {item}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger>Care Instructions</AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/80 space-y-1">
                {(details.careInstructions.length > 0 ? details.careInstructions : ["Gentle hand wash separately in cold water.", "Do not bleach. Dry in shade to preserve colour.", "Iron on reverse on medium heat.", "Store folded with a muslin cloth between pieces."]).map((item) => (
                  <p key={item}>· {item}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="auth">
              <AccordionTrigger>Authenticity</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{details.authenticity ?? "Every piece is hand-embroidered by master artisans from Lucknow. Sourced directly with fair wages."}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-display text-2xl md:text-3xl text-primary text-center mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((r) => (<LandmarkCard key={r.id} id={r.id} slug={r.slug} title={r.name} price={r.price} originalPrice={r.originalPrice} image={r.images[0]} shape={r.cardShape} isDemo={r.isDemo} stock={r.stock} />))}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-display text-2xl md:text-3xl text-primary text-center mb-8">Recently Viewed</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {recent.map((r) => (<LandmarkCard key={r.id} id={r.id} slug={r.slug} title={r.name} price={r.price} originalPrice={r.originalPrice} image={r.images[0]} shape={r.cardShape} isDemo={r.isDemo} stock={r.stock} />))}
          </div>
        </section>
      )}
      <div className="md:hidden fixed bottom-14 inset-x-0 z-30 bg-cream border-t border-border p-3 flex gap-2 items-center">
        <button onClick={handleWishlist} aria-label="Wishlist" className="h-11 w-11 border border-border rounded-full flex items-center justify-center shrink-0"><Heart className={cn("h-5 w-5", wished && "fill-primary text-primary")} /></button>
        <button disabled={selectedStock <= 0} onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">{selectedStock <= 0 ? "Out of Stock" : "Add to Cart"}</button>
        {selectedStock > 0 && <Link to="/checkout" onClick={handleAdd} className="flex-1 bg-gold text-primary text-center py-3 rounded-full text-sm font-medium">Buy Now</Link>}
      </div>
    </div>
  );
}