import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { listPublishedCategories } from "@/lib/storefront.functions";
import { useProductsByCategory } from "@/hooks/use-storefront-products";
import { LandmarkCard } from "@/components/LandmarkCards";
import kurtiWhite from "@/assets/products/kurti-white.jpg";
import kurtaSetIvory from "@/assets/products/kurta-set-ivory.jpg";
import coordPeach from "@/assets/products/coord-peach.jpg";
import palazzoCream from "@/assets/products/palazzo-cream.jpg";
import shararaMaroon from "@/assets/products/sharara-maroon.jpg";
import gararaGold from "@/assets/products/garara-gold.jpg";
import sareePink from "@/assets/products/saree-pink.jpg";
import unstitchedBeige from "@/assets/products/unstitched-beige.jpg";
import tunicWhite from "@/assets/products/tunic-white.jpg";
import noodleStrap from "@/assets/products/noodle-strap.jpg";
import pantsWhite from "@/assets/products/pants-white.jpg";
import anarkaliBridal from "@/assets/products/anarkali-bridal.jpg";

const CATEGORY_BANNERS: Record<string, { image: string; tagline: string; blurb: string }> = {
  "kurtis": { image: kurtiWhite, tagline: "Everyday Elegance", blurb: "Breathable cotton kurtis hand-embroidered with delicate Lucknowi Chikankari — pieces made to wear from morning chai to evening soirée." },
  "kurta-sets": { image: kurtaSetIvory, tagline: "Festive Couture", blurb: "Coordinated kurta, bottom and dupatta — meticulously crafted ensembles for weddings, pujas and milestone moments." },
  "co-ord-sets": { image: coordPeach, tagline: "Effortless Pairing", blurb: "Twin-toned co-ord sets that move with you — modern silhouettes rooted in 400-year-old needlework." },
  "palazzo-sets": { image: palazzoCream, tagline: "Fluid Drapes", blurb: "Flowing palazzos with intricate chikan jaals — comfort tailored for warm Indian afternoons." },
  "sharara-sets": { image: shararaMaroon, tagline: "Royal Lucknow", blurb: "Regal sharara sets inspired by Nawabi heritage — voluminous flares, rich palettes, hand-stitched grace." },
  "garara-sets": { image: gararaGold, tagline: "Bridal Heirloom", blurb: "Statement gararas with heirloom embroidery — designed for the brides and the women who stand beside them." },
  "sarees": { image: sareePink, tagline: "Threaded Poetry", blurb: "Featherlight georgette and cotton sarees whispering centuries-old motifs across every pleat." },
  "unstitched-suits": { image: unstitchedBeige, tagline: "Your Canvas", blurb: "Premium unstitched suit pieces — let your tailor finish the story we began on the loom." },
  "tops-tunics": { image: tunicWhite, tagline: "Modern Heritage", blurb: "Short tops and tunics built for jeans, palazzos and skirts — Chikankari for the everyday wardrobe." },
  "noodle-strap": { image: noodleStrap, tagline: "Summer Soft", blurb: "Breezy noodle-strap tops in handworked cotton — light as a Lucknow monsoon breeze." },
  "pants": { image: pantsWhite, tagline: "Tailored Comfort", blurb: "Chikankari pants and palazzos crafted to pair effortlessly with kurtis from across the collection." },
  "budget": { image: kurtiWhite, tagline: "Under ₹499", blurb: "Authentic Chikankari at honest prices — handpicked styles that make heritage craft accessible." },
  "mid-range": { image: kurtaSetIvory, tagline: "₹500 — ₹1499", blurb: "Our most-loved everyday edits — beautifully balanced craft, comfort and value." },
  "premium": { image: anarkaliBridal, tagline: "₹1500 & Beyond", blurb: "Statement and bridal pieces with the deepest embroidery densities and finest fabrics in our atelier." },
};

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  head: ({ params, loaderData }) => {
    const cat = loaderData as { name: string; slug: string } | undefined;
    const name = cat?.name ?? params.slug;
    const url = `https://indianhandicraftstandards.com/category/${params.slug}`;
    return {
      meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
        { title: `${name} — Indian Handicraft Standards` },
        { name: "description", content: `Shop authentic Lucknowi Chikankari ${name.toLowerCase()}.` },
        { property: "og:title", content: `${name} — Indian Handicraft Standards` },
        { property: "og:description", content: `Hand-embroidered Chikankari ${name.toLowerCase()}.` },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-primary">Category not found</h1>
      <Link to="/shop" className="text-gold mt-4 inline-block">Browse all →</Link>
    </div>
  ),
  loader: async ({ params }) => {
    const categories = await listPublishedCategories();
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return cat;
  },
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const cat = Route.useLoaderData() as { name: string; slug: string } | undefined;
  const items = useProductsByCategory(slug);
  if (!cat) throw notFound();
  const banner = CATEGORY_BANNERS[slug] ?? { image: kurtiWhite, tagline: "Collection", blurb: "Each piece is hand-embroidered in Lucknow using traditional Chikankari techniques — a heritage craft over 400 years old." };
  return (
    <div>
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-secondary/60" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-28">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{banner.tagline}</p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary mt-3 leading-tight">{cat.name}</h1>
            <div className="gold-underline w-24 mt-4" />
            <p className="text-sm md:text-base text-foreground/80 mt-5 leading-relaxed">
              {banner.blurb}
            </p>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-10">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No products in this category yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((p) => (
              <LandmarkCard key={p.id} id={p.id} slug={p.slug} title={p.name} price={p.price} originalPrice={p.originalPrice} image={p.images[0]} shape={p.cardShape} isDemo={p.isDemo} stock={p.stock} badge={p.isBestseller ? "Bestseller" : undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}