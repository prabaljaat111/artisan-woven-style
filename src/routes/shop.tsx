import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { products, categories } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";

const SORT_OPTIONS = [
  { value: "popular", label: "Popularity" },
  { value: "featured", label: "Featured" },
  { value: "new", label: "Newest" },
  { value: "low", label: "Price: Low to High" },
  { value: "high", label: "Price: High to Low" },
  { value: "discount", label: "Biggest Discount" },
] as const;

const PRICE_MIN = 299;
const PRICE_MAX = 6000;

// Validate URL search params so back/forward and shareable links work.
function validateSearch(raw: Record<string, unknown>) {
  const toArr = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : typeof v === "string" && v.length ? v.split(",") : [];
  const num = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const sort = SORT_OPTIONS.find((s) => s.value === raw.sort)?.value ?? "popular";
  return {
    q: typeof raw.q === "string" ? raw.q : "",
    cats: toArr(raw.cats),
    colors: toArr(raw.colors),
    min: Math.max(PRICE_MIN, num(raw.min, PRICE_MIN)),
    max: Math.min(PRICE_MAX, num(raw.max, PRICE_MAX)),
    sale: raw.sale === true || raw.sale === "1" || raw.sale === "true",
    sort,
  };
}

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  validateSearch,
  head: () => ({ meta: [{ title: "Shop All — Indian Handicraft Standards" }, { name: "description", content: "Browse our full collection of authentic Lucknowi Chikankari apparel." }] }),
});

const ALL_COLORS = Array.from(new Set(products.flatMap((p) => p.colors))).sort();

function ShopPage() {
  const navigate = useNavigate({ from: "/shop" });
  const search = Route.useSearch();
  const { q, cats, colors, min, max, sale, sort } = search;
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => { setQLocal(q); }, [q]);
  const [open, setOpen] = useState(false);

  // Debounced push of search query to URL.
  useEffect(() => {
    if (qLocal === q) return;
    const t = setTimeout(() => { navigate({ search: (prev) => ({ ...prev, q: qLocal }) as never, replace: true }); }, 250);
    return () => clearTimeout(t);
  }, [qLocal, q, navigate]);

  function update(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) as never, replace: true });
  }
  function reset() {
    navigate({ search: {} as never, replace: true });
    setQLocal("");
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const PRICE_BUCKETS: Record<string, (price: number) => boolean> = {
      "budget": (p) => p < 500,
      "mid-range": (p) => p >= 500 && p < 1500,
      "premium": (p) => p >= 1500,
    };
    const priceBuckets = cats.filter((c) => c in PRICE_BUCKETS);
    const realCats = cats.filter((c) => !(c in PRICE_BUCKETS));
    let list = products.filter((p) => {
      if (p.price < min || p.price > max) return false;
      if (realCats.length && !realCats.includes(p.category)) return false;
      if (priceBuckets.length && !priceBuckets.some((b) => PRICE_BUCKETS[b](p.price))) return false;
      if (colors.length && !p.colors.some((c) => colors.includes(c))) return false;
      if (sale && !(p.originalPrice > p.price)) return false;
      if (needle) {
        const hay = `${p.name} ${p.category} ${p.colors.join(" ")} ${p.description}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const disc = (p: typeof products[number]) => p.originalPrice > 0 ? (p.originalPrice - p.price) / p.originalPrice : 0;
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "new") list = [...list].sort((a, b) => Number(b.isNew ?? 0) - Number(a.isNew ?? 0));
    else if (sort === "discount") list = [...list].sort((a, b) => disc(b) - disc(a));
    else if (sort === "featured") list = [...list].sort((a, b) => (Number(b.isBestseller ?? 0) - Number(a.isBestseller ?? 0)) || (Number(b.isNew ?? 0) - Number(a.isNew ?? 0)) || (b.rating - a.rating));
    else list = [...list].sort((a, b) => (Number(b.isBestseller ?? 0) - Number(a.isBestseller ?? 0)) || (b.rating - a.rating) || (b.reviews - a.reviews));
    return list;
  }, [cats, colors, min, max, sale, sort, q]);

  const activeFilterCount =
    cats.length + colors.length + (sale ? 1 : 0) + (min > PRICE_MIN ? 1 : 0) + (max < PRICE_MAX ? 1 : 0);

  function toggleArr(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Category</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={cats.includes(c.slug)} onChange={() => update({ cats: toggleArr(cats, c.slug) })} className="accent-primary" />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Price ₹{min} – ₹{max}</h3>
        <div className="space-y-3">
          <label className="text-xs text-muted-foreground flex items-center justify-between">Min <span>₹{min}</span></label>
          <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={100} value={min} onChange={(e) => update({ min: Math.min(+e.target.value, max) })} className="w-full accent-primary" />
          <label className="text-xs text-muted-foreground flex items-center justify-between">Max <span>₹{max}</span></label>
          <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={100} value={max} onChange={(e) => update({ max: Math.max(+e.target.value, min) })} className="w-full accent-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Color</h3>
        <div className="flex flex-wrap gap-1.5">
          {ALL_COLORS.map((c) => {
            const active = colors.includes(c);
            return (
              <button key={c} type="button" onClick={() => update({ colors: toggleArr(colors, c) })} className={`text-[11px] px-2.5 py-1 rounded-full border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}>{c}</button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={sale} onChange={(e) => update({ sale: e.target.checked })} className="accent-primary" />
          On Sale only
        </label>
      </div>
      {activeFilterCount > 0 && (
        <button onClick={reset} className="text-xs text-gold hover:text-primary underline">Clear all filters</button>
      )}
    </div>
  );

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Category</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cats.includes(c.slug)} onChange={(e) => setCats((s) => e.target.checked ? [...s, c.slug] : s.filter((x) => x !== c.slug))} className="accent-primary" />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Price up to ₹{maxPrice}</h3>
        <input type="range" min={299} max={6000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-primary" />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-5xl text-primary">The Collection</h1>
        <div className="gold-underline w-24 mx-auto mt-3" />
        <p className="text-sm text-muted-foreground mt-3">{filtered.length} pieces</p>
      </div>
      <div className="relative max-w-md mx-auto mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="Search kurtis, sarees, sharara…"
          className="w-full pl-9 pr-9 py-2.5 border border-border rounded-full text-sm bg-background focus:outline-none focus:border-gold"
        />
        {qLocal && (
          <button onClick={() => { setQLocal(""); update({ q: "" }); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {(activeFilterCount > 0 || q) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 justify-center">
          {q && <Chip label={`"${q}"`} onRemove={() => { setQLocal(""); update({ q: "" }); }} />}
          {cats.map((c) => <Chip key={c} label={categories.find((x) => x.slug === c)?.name ?? c} onRemove={() => update({ cats: cats.filter((x) => x !== c) })} />)}
          {colors.map((c) => <Chip key={c} label={c} onRemove={() => update({ colors: colors.filter((x) => x !== c) })} />)}
          {min > PRICE_MIN && <Chip label={`Min ₹${min}`} onRemove={() => update({ min: PRICE_MIN })} />}
          {max < PRICE_MAX && <Chip label={`Max ₹${max}`} onRemove={() => update({ max: PRICE_MAX })} />}
          {sale && <Chip label="On Sale" onRemove={() => update({ sale: false })} />}
          {(activeFilterCount > 0 || q) && (
            <button onClick={reset} className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary px-2 py-1">Clear all</button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-3">
        <button onClick={() => setOpen(true)} className="md:hidden flex items-center gap-2 text-sm border border-border rounded-full px-4 py-2">
          <SlidersHorizontal className="h-4 w-4" /> Filter{activeFilterCount > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full bg-primary text-primary-foreground px-1">{activeFilterCount}</span>}
        </button>
        <select value={sort} onChange={(e) => update({ sort: e.target.value as typeof sort })} className="ml-auto text-sm border border-border rounded-full px-4 py-2 bg-background">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden md:block">{FilterPanel}</aside>
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <p className="font-display text-xl text-primary">No pieces match your filters</p>
              <p className="text-sm text-muted-foreground mt-2">Try widening price, removing a colour, or clearing search.</p>
              <button onClick={reset} className="mt-5 bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => (
                <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} isDemo={p.isDemo} badge={p.isBestseller ? "Bestseller" : p.isNew ? "New" : undefined} />
              ))}
            </div>
          )}
        </div>
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-foreground/40" onClick={() => setOpen(false)}>
          <div className="absolute bottom-0 inset-x-0 bg-cream rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-primary">Filters</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {FilterPanel}
            <button onClick={() => setOpen(false)} className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-full font-medium">Show {filtered.length} results</button>
          </div>
        </div>
      )}
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <Link to="/about" className="hover:text-primary">Learn about our craftsmanship →</Link>
      </div>
    </div>
  );
}