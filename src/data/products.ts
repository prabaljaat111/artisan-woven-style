export type CardShape = "taj" | "imambara" | "clocktower";

import kurtiWhite from "@/assets/products/kurti-white.jpg";
import kurtiMint from "@/assets/products/kurti-mint.jpg";
import kurtaSetIvory from "@/assets/products/kurta-set-ivory.jpg";
import kurtaSetMaroon from "@/assets/products/kurta-set-maroon.jpg";
import palazzoCream from "@/assets/products/palazzo-cream.jpg";
import shararaMaroon from "@/assets/products/sharara-maroon.jpg";
import gararaGold from "@/assets/products/garara-gold.jpg";
import sareeOffwhite from "@/assets/products/saree-offwhite.jpg";
import sareePink from "@/assets/products/saree-pink.jpg";
import unstitchedBeige from "@/assets/products/unstitched-beige.jpg";
import tunicWhite from "@/assets/products/tunic-white.jpg";
import noodleStrap from "@/assets/products/noodle-strap.jpg";
import pantsWhite from "@/assets/products/pants-white.jpg";
import anarkaliBridal from "@/assets/products/anarkali-bridal.jpg";

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice: number;
  images: string[];
  sizes: string[];
  colors: string[];
  description: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  isNew?: boolean;
  isBestseller?: boolean;
  cardShape: CardShape;
}

export const categories = [
  { slug: "kurtis", name: "Kurtis" },
  { slug: "kurta-sets", name: "Kurta Sets" },
  { slug: "palazzo-sets", name: "Palazzo Sets" },
  { slug: "sharara-sets", name: "Sharara Sets" },
  { slug: "garara-sets", name: "Garara Sets" },
  { slug: "sarees", name: "Sarees" },
  { slug: "unstitched-suits", name: "Unstitched Suits" },
  { slug: "tops-tunics", name: "Short Tops & Tunics" },
  { slug: "noodle-strap", name: "Noodle Strap Tops" },
  { slug: "pants", name: "Pants" },
  { slug: "budget", name: "Budget Collection (Under ₹499)" },
  { slug: "mid-range", name: "Mid-Range (₹500–₹1499)" },
  { slug: "premium", name: "Premium Collection (₹1500+)" },
];

const shapes: CardShape[] = ["taj", "imambara", "clocktower"];

const base = [
  { name: "Lucknowi Chikankari Cotton Kurti — White", category: "kurtis", price: 499, originalPrice: 799, image: kurtiWhite },
  { name: "Pastel Mint Chikan Kurti", category: "kurtis", price: 599, originalPrice: 999, image: kurtiMint },
  { name: "Ivory Hand-Embroidered Kurta Set", category: "kurta-sets", price: 1499, originalPrice: 2499, image: kurtaSetIvory },
  { name: "Maroon Festive Kurta Set", category: "kurta-sets", price: 1899, originalPrice: 2999, image: kurtaSetMaroon },
  { name: "Cream Chikankari Palazzo Set", category: "palazzo-sets", price: 1799, originalPrice: 2799, image: palazzoCream },
  { name: "Peach Palazzo with Dupatta", category: "palazzo-sets", price: 1699, originalPrice: 2699, image: palazzoCream },
  { name: "Royal Maroon Sharara Set", category: "sharara-sets", price: 2999, originalPrice: 4499, image: shararaMaroon },
  { name: "Mint Green Sharara Suit", category: "sharara-sets", price: 2799, originalPrice: 3999, image: palazzoCream },
  { name: "Bridal Gold Garara Set", category: "garara-sets", price: 3999, originalPrice: 5999, image: gararaGold },
  { name: "Chikankari Cotton Saree — Off White", category: "sarees", price: 2499, originalPrice: 3999, image: sareeOffwhite },
  { name: "Pastel Pink Georgette Saree", category: "sarees", price: 3299, originalPrice: 4999, image: sareePink },
  { name: "Unstitched Cotton Suit Piece", category: "unstitched-suits", price: 899, originalPrice: 1499, image: unstitchedBeige },
  { name: "Premium Unstitched Suit — Beige", category: "unstitched-suits", price: 1299, originalPrice: 1999, image: unstitchedBeige },
  { name: "Short Chikan Tunic Top", category: "tops-tunics", price: 399, originalPrice: 699, image: tunicWhite },
  { name: "Boho Chikankari Crop Top", category: "tops-tunics", price: 449, originalPrice: 799, image: tunicWhite },
  { name: "Noodle Strap Chikan Top", category: "noodle-strap", price: 349, originalPrice: 599, image: noodleStrap },
  { name: "Sleeveless Chikan Camisole", category: "noodle-strap", price: 299, originalPrice: 499, image: noodleStrap },
  { name: "Chikankari Cotton Pants — White", category: "pants", price: 599, originalPrice: 999, image: pantsWhite },
  { name: "Straight-Cut Embroidered Pants", category: "pants", price: 699, originalPrice: 1199, image: pantsWhite },
  { name: "Heritage Bridal Anarkali", category: "kurta-sets", price: 4999, originalPrice: 7999, image: anarkaliBridal },
];

// Deterministic ratings/reviews so SSR markup matches client render (no hydration flicker).
const RATING_SEED = [4.6, 4.8, 4.5, 4.9, 4.4, 4.7, 4.85, 4.3, 4.6, 4.75, 4.5, 4.65, 4.55, 4.7, 4.8, 4.4, 4.6, 4.5, 4.75, 4.9];
const REVIEW_SEED = [128, 412, 87, 356, 64, 245, 198, 73, 312, 156, 95, 234, 178, 289, 401, 52, 167, 110, 273, 388];

export const products: Product[] = base.map((p, i) => {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: String(i + 1),
    name: p.name,
    slug,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    images: [p.image, p.image, p.image, p.image],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Ivory", "Maroon", "Mint", "Pastel Pink"],
    description:
      "Authentic hand-embroidered Lucknowi Chikankari crafted by master artisans in Lucknow. Pure breathable fabric with intricate floral and paisley motifs — a heritage piece for the modern wardrobe.",
    inStock: true,
    rating: RATING_SEED[i % RATING_SEED.length],
    reviews: REVIEW_SEED[i % REVIEW_SEED.length],
    isNew: i % 5 === 0,
    isBestseller: i % 4 === 0,
    cardShape: shapes[i % shapes.length],
  };
});

export function byCategory(slug: string): Product[] {
  if (slug === "budget") return products.filter((p) => p.price < 500);
  if (slug === "mid-range") return products.filter((p) => p.price >= 500 && p.price < 1500);
  if (slug === "premium") return products.filter((p) => p.price >= 1500);
  return products.filter((p) => p.category === slug);
}

export function findProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}