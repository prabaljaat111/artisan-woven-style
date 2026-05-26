import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { products, categories } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  head: () => ({ meta: [{ title: "Shop All — Indian Handicraft Standards" }, { name: "description", content: "Browse our full collection of authentic Lucknowi Chikankari apparel." }] }),
});

function ShopPage() {
  const [cats, setCats] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(6000);
  const [sort, setSort] = useState("popular");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.price <= maxPrice && (cats.length === 0 || cats.includes(p.category)));
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "new") list = [...list].sort((a, b) => Number(b.isNew ?? 0) - Number(a.isNew ?? 0));
    return list;
  }, [cats, maxPrice, sort]);

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
      <div className="flex items-center justify-between mb-6 gap-3">
        <button onClick={() => setOpen(true)} className="md:hidden flex items-center gap-2 text-sm border border-border rounded-full px-4 py-2">
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto text-sm border border-border rounded-full px-4 py-2 bg-background">
          <option value="popular">Popularity</option>
          <option value="new">Newest</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden md:block">{FilterPanel}</aside>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((p) => (
            <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} badge={p.isBestseller ? "Bestseller" : p.isNew ? "New" : undefined} />
          ))}
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