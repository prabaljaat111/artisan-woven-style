import type { Product, ProductVariation } from "@/data/products";

export function selectedVariation(product: Product, size: string, color: string): ProductVariation | undefined {
  const matches = product.variations?.filter(v => v.status !== "inactive" && v.size.trim().toLowerCase() === size.trim().toLowerCase());
  const exact = matches?.find(v => (v.color ?? "").trim().toLowerCase() === color.trim().toLowerCase());
  if (exact) return exact;
  // Legacy size-only products use the parent color; never let a colorless row override a colored row.
  return matches?.every(v => !v.color) ? matches[0] : undefined;
}

export function selectionStock(product: Product, size: string, color: string): number {
  if (product.variations?.length) {
    const variant = selectedVariation(product, size, color);
    if (!variant) return 0;
    return product.trackInventory === false || product.allowBackorders ? 999 : variant.stock;
  }
  if (!product.sizes.includes(size)) return 0;
  return product.trackInventory === false || product.allowBackorders ? 999 : product.stock;
}

export function selectionPrice(product: Product, size: string, color: string): number {
  const variant = selectedVariation(product, size, color);
  return variant?.salePrice ?? variant?.price ?? product.price;
}