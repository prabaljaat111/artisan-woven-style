import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { ShoppingBag, Heart, Volume2, VolumeX, Play } from "lucide-react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { toast } from "sonner";

export const Route = createFileRoute("/watch-and-buy")({
  head: () => ({
    meta: [{ property: "og:title", content: "Watch & Buy \u2014 Shoppable Chikankari Reels | Indian Handicraft Standards" }, { property: "og:description", content: "Tap through styled looks of hand-embroidered Chikankari and shop straight from the reel." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
      { title: "Watch & Buy — Shoppable Chikankari Reels | Indian Handicraft Standards" },
      { name: "description", content: "Tap through styled looks of hand-embroidered Chikankari and shop straight from the reel." },
      { property: "og:url", content: "https://indianhandicraftstandards.com/watch-and-buy" },
    ],
    links: [{ rel: "canonical", href: "https://indianhandicraftstandards.com/watch-and-buy" }],
  }),
  component: WatchAndBuy,
});

function WatchAndBuy() {
  const products = useStorefrontProducts();
  const reels = products.filter((p) => p.isBestseller || p.isNew).slice(0, 12);
  const all = reels.length ? reels : products.slice(0, 12);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  // Track visible reel via IntersectionObserver so only one plays at a time.
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the highest visibility >= 0.6.
        let bestIdx = activeIdx;
        let bestRatio = 0;
        entries.forEach((e) => {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            bestIdx = idx;
          }
        });
        if (bestRatio >= 0.6) setActiveIdx(bestIdx);
      },
      { root, threshold: [0, 0.6, 0.9] },
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [all.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play only the active video; pause & rewind the rest.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.muted = muted;
      if (i === activeIdx) {
        v.play().catch(() => { /* user gesture may be required — noop */ });
      } else {
        v.pause();
        try { v.currentTime = 0; } catch { /* noop */ }
      }
    });
  }, [activeIdx, muted]);

  const jumpTo = useCallback((i: number) => {
    const el = slideRefs.current[i];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="bg-primary min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto grid md:grid-cols-[1fr_320px] gap-0 md:gap-6 md:p-4">
        {/* Reel feed */}
        <div
          ref={feedRef}
          className="h-[calc(100vh-4rem)] md:h-[85vh] overflow-y-scroll snap-y snap-mandatory md:rounded-2xl md:mx-auto md:aspect-[9/16] md:max-w-[420px] bg-black no-scrollbar"
          style={{ scrollbarWidth: "none" }}
        >
          {all.map((p, i) => (
            <ReelSlide
              key={p.id}
              product={p}
              index={i}
              total={all.length}
              isActive={i === activeIdx}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              slideRef={(el) => { slideRefs.current[i] = el; }}
              videoRef={(el) => { videoRefs.current[i] = el; }}
            />
          ))}
        </div>

        {/* Desktop thumbnails rail */}
        <aside className="hidden md:block">
          <div className="sticky top-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Shoppable looks</p>
            <h1 className="font-display text-2xl text-primary-foreground leading-tight mb-4">Watch &amp; Buy</h1>
            <div className="grid grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto pr-1">
              {all.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => jumpTo(i)}
                  className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition ${
                    i === activeIdx ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Play ${p.name}`}
                >
                  <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReelSlide({
  product,
  index,
  total,
  isActive,
  muted,
  onToggleMute,
  slideRef,
  videoRef,
}: {
  product: ReturnType<typeof useStorefrontProducts>[number];
  index: number;
  total: number;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  slideRef: (el: HTMLElement | null) => void;
  videoRef: (el: HTMLVideoElement | null) => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(product.id);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const localVideo = useRef<HTMLVideoElement | null>(null);

  const hasVideo = !!product.videoUrl;

  return (
    <section
      ref={(el) => { slideRef(el); }}
      data-idx={index}
      className="relative snap-start h-[calc(100vh-4rem)] md:h-full w-full flex items-center justify-center bg-black overflow-hidden"
    >
      {hasVideo ? (
        <video
          ref={(el) => { localVideo.current = el; videoRef(el); }}
          src={product.videoUrl ?? undefined}
          poster={product.images[0]}
          playsInline
          loop
          muted={muted}
          preload={isActive ? "auto" : "metadata"}
          onClick={() => {
            const v = localVideo.current;
            if (!v) return;
            if (v.paused) { v.play(); setManuallyPaused(false); }
            else { v.pause(); setManuallyPaused(true); }
          }}
          className="absolute inset-0 h-full w-full object-cover cursor-pointer"
        />
      ) : (
        <img
          src={product.images[0]}
          alt={product.name}
          className={`absolute inset-0 h-full w-full object-cover ${isActive ? "animate-kenburns" : ""}`}
        />
      )}

      {/* gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

      {/* top bar */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
        <span className="bg-white/95 text-primary text-[11px] font-medium rounded-full px-3 py-1 flex items-center gap-1">
          <Play className="h-3 w-3 fill-primary" /> Reel {index + 1}/{total}
        </span>
        <div className="flex gap-2">
          {hasVideo && (
            <button
              onClick={onToggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="h-10 w-10 rounded-full bg-white/95 flex items-center justify-center shadow"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
          <button
            onClick={() => { toggle(product.id); toast(wished ? "Removed from wishlist" : "Added to wishlist 🌸"); }}
            aria-label="Wishlist"
            className="h-10 w-10 rounded-full bg-white/95 flex items-center justify-center shadow"
          >
            <Heart className={wished ? "h-5 w-5 fill-accent text-accent" : "h-5 w-5 text-foreground"} />
          </button>
        </div>
      </div>

      {/* paused indicator */}
      {hasVideo && manuallyPaused && isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="h-8 w-8 fill-primary text-primary ml-1" />
          </div>
        </div>
      )}

      {/* bottom info + CTA */}
      <div className="absolute bottom-0 inset-x-0 p-4 z-10 text-white space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider opacity-80">{product.category.replace(/-/g, " ")}</p>
          <h2 className="font-display text-xl leading-tight mt-0.5">{product.name}</h2>
          <p className="mt-1 text-sm">
            <span className="font-bold">₹{product.price.toLocaleString("en-IN")}</span>
            {product.originalPrice > product.price && (
              <span className="line-through opacity-70 text-xs ml-2">₹{product.originalPrice.toLocaleString("en-IN")}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              addItem({
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.images[0],
                size: product.sizes[Math.min(2, product.sizes.length - 1)],
                color: product.colors[0] ?? "",
                qty: 1,
              });
              toast("Added to cart 🛍️");
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-primary rounded-full py-3 text-sm font-semibold hover:bg-white/90 transition"
          >
            <ShoppingBag className="h-4 w-4" /> Add to cart
          </button>
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="inline-flex items-center justify-center px-5 rounded-full border border-white/70 text-sm font-medium text-white hover:bg-white/10"
          >
            View
          </Link>
        </div>
      </div>
    </section>
  );
}