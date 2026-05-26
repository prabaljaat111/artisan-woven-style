import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Star, MessageCircle, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { findProduct, products, type Product } from "@/data/products";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { LandmarkCard } from "@/components/LandmarkCards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
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
  const wished = mounted && ids.includes(p.id);
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);

  const handleAdd = () => addItem({ id: p.id, name: p.name, slug: p.slug, price: p.price, image: p.images[0], size, color, qty });

  return (
    <div className="pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 grid md:grid-cols-2 gap-8 md:gap-14">
        <div>
          <div className="aspect-[4/5] bg-secondary rounded-2xl overflow-hidden border border-gold/30">
            <img src={p.images[imgIdx]} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {p.images.map((src: string, i: number) => (
              <button key={i} onClick={() => setImgIdx(i)} className={cn("h-20 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2", i === imgIdx ? "border-gold" : "border-border")}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">{p.category}</p>
          <h1 className="font-display text-3xl md:text-4xl text-primary mt-2">{p.name}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-gold text-gold" /> {p.rating.toFixed(1)} ({p.reviews} reviews)
          </div>
          <div className="flex items-baseline gap-3 mt-4 flex-wrap">
            <span className="font-display text-3xl text-primary">₹{p.price.toLocaleString("en-IN")}</span>
            <span className="line-through text-muted-foreground">₹{p.originalPrice.toLocaleString("en-IN")}</span>
            <span className="bg-gold text-primary text-xs font-bold px-2 py-1 rounded">{Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF</span>
          </div>
          <p className="text-[11px] text-terracotta mt-2">🔥 24 people viewed this in the last hour</p>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Size</span><button className="text-xs text-gold underline">Size Guide</button></div>
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
            <button onClick={() => toggle(p.id)} aria-label="Wishlist" className="h-12 w-12 border border-border rounded-full flex items-center justify-center"><Heart className={cn("h-5 w-5", wished && "fill-primary text-primary")} /></button>
          </div>
          <a href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi! I'd like to know more about ${p.name}`)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[#25D366] font-medium">
            <MessageCircle className="h-4 w-4" /> Ask about this product on WhatsApp
          </a>
          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            {[{ icon: Truck, label: "Free shipping ₹999+" },{ icon: RotateCcw, label: "7-day returns" },{ icon: ShieldCheck, label: "Authentic craft" }].map((b) => (
              <div key={b.label} className="bg-secondary/50 rounded-lg p-3"><b.icon className="h-4 w-4 text-gold mx-auto" /><p className="text-[11px] mt-1 text-muted-foreground leading-tight">{b.label}</p></div>
            ))}
          </div>
          <div className="mt-8"><h2 className="font-display text-lg text-primary mb-2">Description</h2><p className="text-sm text-foreground/85 leading-relaxed">{p.description}</p></div>
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
            {related.map((r) => (<LandmarkCard key={r.id} id={r.id} slug={r.slug} title={r.name} price={r.price} originalPrice={r.originalPrice} image={r.images[0]} shape={r.cardShape} />))}
          </div>
        </section>
      )}
      <div className="md:hidden fixed bottom-14 inset-x-0 z-30 bg-cream border-t border-border p-3 flex gap-2">
        <button onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium">Add to Cart</button>
        <Link to="/checkout" onClick={handleAdd} className="flex-1 bg-gold text-primary text-center py-3 rounded-full text-sm font-medium">Buy Now</Link>
      </div>
    </div>
  );
}