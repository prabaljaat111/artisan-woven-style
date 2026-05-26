import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import type { CardShape } from "@/data/products";
import { useWishlist } from "@/store/wishlist";
import { cn } from "@/lib/utils";

interface CardProps {
  id: string;
  slug: string;
  image: string;
  title: string;
  price: number;
  originalPrice?: number;
  shape: CardShape;
  badge?: string;
}

const clipMap: Record<CardShape, string> = {
  taj: "clip-taj",
  imambara: "clip-arch",
  clocktower: "clip-clocktower",
};

export function LandmarkCard({ id, slug, image, title, price, originalPrice, shape, badge }: CardProps) {
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(id);
  const discount = originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} className="group relative">
      <Link to="/product/$slug" params={{ slug }} className="block">
        <div className="relative overflow-visible">
          <div className={cn("relative bg-secondary transition-shadow duration-300", clipMap[shape], "group-hover:drop-shadow-[0_8px_24px_rgba(201,168,76,0.45)]")} style={{ aspectRatio: "200/400" }}>
            <img src={image} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className={cn("absolute inset-0 pointer-events-none", clipMap[shape])} style={{ boxShadow: "inset 0 0 0 1.5px var(--gold)", opacity: 0.5 }} />
          </div>
          {badge && (
            <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wider">{badge}</span>
          )}
          {discount > 0 && (
            <span className="absolute top-2 right-2 z-10 bg-gold text-primary text-[10px] font-bold px-2 py-1 rounded-full">-{discount}%</span>
          )}
        </div>
      </Link>
      <button aria-label="Toggle wishlist" onClick={(e) => { e.preventDefault(); toggle(id); }} className="absolute top-12 right-2 z-20 h-9 w-9 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow hover:bg-background transition">
        <Heart className={cn("h-4 w-4", wished ? "fill-primary text-primary" : "text-foreground")} />
      </button>
      <div className="pt-3 text-center px-2">
        <h3 className="font-display text-sm md:text-base text-foreground line-clamp-2 leading-tight">{title}</h3>
        <div className="mt-1.5 flex items-baseline justify-center gap-2">
          <span className="text-primary font-semibold">₹{price.toLocaleString("en-IN")}</span>
          {originalPrice && originalPrice > price && (
            <span className="text-muted-foreground line-through text-xs">₹{originalPrice.toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}