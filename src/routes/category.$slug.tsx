import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { byCategory, categories } from "@/data/products";
import { LandmarkCard } from "@/components/LandmarkCards";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-primary">Category not found</h1>
      <Link to="/shop" className="text-gold mt-4 inline-block">Browse all →</Link>
    </div>
  ),
  loader: ({ params }) => {
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return cat;
  },
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const cat = Route.useLoaderData();
  const items = byCategory(slug);
  return (
    <div>
      <section className="relative bg-secondary/60 border-b border-border overflow-hidden">
        <div className="absolute inset-x-0 top-0 mx-auto opacity-10 clip-arch bg-primary h-64 w-64" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Collection</p>
          <h1 className="font-display text-4xl md:text-5xl text-primary mt-2">{cat.name}</h1>
          <div className="gold-underline w-24 mx-auto mt-4" />
          <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
            Each piece is hand-embroidered in Lucknow using traditional Chikankari techniques — a heritage craft over 400 years old.
          </p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-10">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No products in this category yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((p) => (
              <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} badge={p.isBestseller ? "Bestseller" : undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}