import type { Product, ProductVariation } from "@/data/products";

export function selectedVariation(product: Product, size: string, color: string): ProductVariation | undefined {
  return product.variations?.find(v => v.status !== "inactive" && v.size.toLowerCase() === size.toLowerCase() && (!v.color || v.color.toLowerCase() === color.toLowerCase()));
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