import { describe, expect, it } from "vitest";
import type { Product } from "@/data/products";
import { selectedVariation, selectionPrice, selectionStock } from "./product-selection";
const product: Product = { id: "p", name: "Kurti", slug: "kurti", category: "kurtis", price: 500, originalPrice: 700, images: [], sizes: ["S", "M"], colors: ["Black", "White"], description: "", inStock: true, stock: 10, rating: 0, reviews: 0, cardShape: "taj", variations: [
  { id: "black", size: "S", color: "Black", stock: 0, price: 800, salePrice: 650, image: null, status: "active" },
  { id: "white", size: "S", color: "White", stock: 5, price: 900, salePrice: null, image: null, status: "active" },
  { id: "inactive", size: "M", color: "Black", stock: 5, price: 800, salePrice: null, image: null, status: "inactive" },
] };
describe("Current product variation binding", () => {
  it("does not use White stock for an out-of-stock Black variation", () => expect(selectionStock(product, "S", "Black")).toBe(0));
  it("uses the selected color's stock", () => expect(selectionStock(product, "S", "White")).toBe(5));
  it("uses selected sale price instead of parent price", () => expect(selectionPrice(product, "S", "Black")).toBe(650));
  it("uses selected regular price when no variation sale is active", () => expect(selectionPrice(product, "S", "White")).toBe(900));
  it("blocks inactive variations", () => expect(selectionStock(product, "M", "Black")).toBe(0));
  it("blocks missing combinations", () => expect(selectionStock(product, "M", "White")).toBe(0));
  it("matches a colored row before a legacy colorless row", () => { const p = { ...product, variations: [{ ...product.variations?.[0], id: "legacy", size: "S", color: null, stock: 9, price: 300, salePrice: null, image: null, status: "active" }, ...(product.variations ?? [])] }; expect(selectedVariation(p, "S", "White")?.id).toBe("white"); });
  it("does not invent size stock for simple products", () => expect(selectionStock({ ...product, variations: [] }, "S", "Black")).toBe(10));
});