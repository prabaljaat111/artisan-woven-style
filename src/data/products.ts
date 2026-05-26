export type CardShape = "taj" | "imambara" | "clocktower";

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
const img = (seed: string, color = "f5e6d0", text = "6B1A2B") =>
  `https://placehold.co/600x800/${color}/${text}?text=${encodeURIComponent(seed)}&font=playfair`;

const base = [
  { name: "Lucknowi Chikankari Cotton Kurti — White", category: "kurtis", price: 499, originalPrice: 799 },
  { name: "Pastel Mint Chikan Kurti", category: "kurtis", price: 599, originalPrice: 999 },
  { name: "Ivory Hand-Embroidered Kurta Set", category: "kurta-sets", price: 1499, originalPrice: 2499 },
  { name: "Maroon Festive Kurta Set", category: "kurta-sets", price: 1899, originalPrice: 2999 },
  { name: "Cream Chikankari Palazzo Set", category: "palazzo-sets", price: 1799, originalPrice: 2799 },
  { name: "Peach Palazzo with Dupatta", category: "palazzo-sets", price: 1699, originalPrice: 2699 },
  { name: "Royal Maroon Sharara Set", category: "sharara-sets", price: 2999, originalPrice: 4499 },
  { name: "Mint Green Sharara Suit", category: "sharara-sets", price: 2799, originalPrice: 3999 },
  { name: "Bridal Gold Garara Set", category: "garara-sets", price: 3999, originalPrice: 5999 },
  { name: "Chikankari Cotton Saree — Off White", category: "sarees", price: 2499, originalPrice: 3999 },
  { name: "Pastel Pink Georgette Saree", category: "sarees", price: 3299, originalPrice: 4999 },
  { name: "Unstitched Cotton Suit Piece", category: "unstitched-suits", price: 899, originalPrice: 1499 },
  { name: "Premium Unstitched Suit — Beige", category: "unstitched-suits", price: 1299, originalPrice: 1999 },
  { name: "Short Chikan Tunic Top", category: "tops-tunics", price: 399, originalPrice: 699 },
  { name: "Boho Chikankari Crop Top", category: "tops-tunics", price: 449, originalPrice: 799 },
  { name: "Noodle Strap Chikan Top", category: "noodle-strap", price: 349, originalPrice: 599 },
  { name: "Sleeveless Chikan Camisole", category: "noodle-strap", price: 299, originalPrice: 499 },
  { name: "Chikankari Cotton Pants — White", category: "pants", price: 599, originalPrice: 999 },
  { name: "Straight-Cut Embroidered Pants", category: "pants", price: 699, originalPrice: 1199 },
  { name: "Heritage Bridal Anarkali", category: "kurta-sets", price: 4999, originalPrice: 7999 },
];

const palette = ["f5e6d0", "fdf6ec", "e8d5b7", "c0714a", "c9a84c", "8b7355"];

export const products: Product[] = base.map((p, i) => {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const color = palette[i % palette.length];
  return {
    id: String(i + 1),
    name: p.name,
    slug,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    images: [
      img(p.name.split(" ").slice(0, 2).join(" "), color),
      img("Detail", color),
      img("Back", color),
      img("Fabric", color),
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Ivory", "Maroon", "Mint", "Pastel Pink"],
    description:
      "Authentic hand-embroidered Lucknowi Chikankari crafted by master artisans in Lucknow. Pure breathable fabric with intricate floral and paisley motifs — a heritage piece for the modern wardrobe.",
    inStock: true,
    rating: 4 + Math.random() * 0.9,
    reviews: Math.floor(50 + Math.random() * 400),
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