import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useWishlist } from "@/store/wishlist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CardProps {
  id: string;
  slug: string;
  image: string;
  title: string;
  price: number;
  originalPrice?: number;
  shape?: string;
  badge?: string;
  isDemo?: boolean;
  stock?: number;
  trackInventory?: boolean;
  lowStockThreshold?: number;
}

export function LandmarkCard({ id, slug, image, title, price, originalPrice, badge, isDemo, stock, trackInventory = true, lowStockThreshold = 10 }: CardProps) {
  const { ids, toggle } = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const wished = mounted && ids.includes(id);
  const discount = originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const stockBadge =
    typeof stock === "number" && trackInventory
      ? stock <= 0
        ? { text: "Out of Stock", cls: "bg-red-600 text-white" }
        : stock <= lowStockThreshold
          ? { text: `Only ${stock} left`, cls: "bg-amber-500 text-white" }
          : null
      : null;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 220, damping: 20 }} className="group relative">
      <Link to="/product/$slug" params={{ slug }} className="block">
        <div className="relative overflow-hidden rounded-xl bg-secondary/60 aspect-[3/4]">
          <img src={image} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          {badge && (
            <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-1 rounded uppercase tracking-wider">{badge}</span>
          )}
          {discount > 0 && (
            <span className="absolute top-2 right-2 z-10 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded">-{discount}%</span>
          )}
          {isDemo && (
            <span className="absolute bottom-2 left-2 z-10 bg-background/85 backdrop-blur text-foreground/80 text-[9px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase border border-border">Sample</span>
          )}
          {stockBadge && (
            <span className={cn("absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow", stockBadge.cls)}>
              {stockBadge.text}
            </span>
          )}
          <button aria-label="Toggle wishlist" onClick={(e) => { e.preventDefault(); const wasWished = ids.includes(id); toggle(id); toast(wasWished ? "Removed from wishlist" : "Added to wishlist 🌸"); }} className="absolute bottom-2 right-2 z-20 h-9 w-9 rounded-full bg-background/95 backdrop-blur flex items-center justify-center shadow hover:bg-background transition">
            <Heart className={cn("h-4 w-4", wished ? "fill-accent text-accent" : "text-foreground")} />
          </button>
        </div>
      </Link>
      <div className="pt-3 px-1">
        <h3 className="text-sm text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">{title}</h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-primary font-semibold text-base">₹{price.toLocaleString("en-IN")}</span>
          {originalPrice && originalPrice > price && (
            <>
              <span className="text-muted-foreground line-through text-xs">₹{originalPrice.toLocaleString("en-IN")}</span>
              <span className="text-accent text-xs font-semibold">{discount}% off</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}