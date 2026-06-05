import { createFileRoute, Link } from "@tanstack/react-router";
import { categories, byCategory } from "@/data/products";

export const Route = createFileRoute("/category/")({
  head: () => ({
    meta: [
      { title: "Shop by Category — Indian Handicraft Standards" },
      { name: "description", content: "Browse all Chikankari categories — kurtis, kurta sets, sarees, sharara, palazzo, and more." },
      { property: "og:url", content: "https://indianhandicraft.revnlabel.in/category" },
    ],
    links: [{ rel: "canonical", href: "https://indianhandicraft.revnlabel.in/category" }],
  }),
  component: CategoryIndex,
});

function CategoryIndex() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 pb-24 md:pb-10">
      <header className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Explore</p>
        <h1 className="font-display text-3xl md:text-4xl text-primary mt-2">Shop by Category</h1>
        <div className="gold-underline w-20 mx-auto mt-3" />
        <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">Tap a category to view hand-embroidered Lucknowi Chikankari pieces.</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {categories.map((c) => {
          const count = byCategory(c.slug).length;
          return (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="group relative rounded-xl border border-border bg-secondary/40 hover:bg-secondary transition p-4 min-h-[96px] flex flex-col justify-between"
            >
              <span className="font-display text-base md:text-lg text-primary leading-tight">{c.name}</span>
              <span className="text-[11px] text-muted-foreground mt-2">{count} {count === 1 ? "piece" : "pieces"} →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}