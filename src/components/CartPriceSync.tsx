import { useEffect } from "react";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { useCart } from "@/store/cart";
import { selectionPrice, selectedVariation } from "@/lib/product-selection";

export function CartPriceSync() {
  const products = useStorefrontProducts();
  const items = useCart(state => state.items);
  useEffect(() => {
    if (!products.length || !items.length) return;
    let changed = false;
    const next = items.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return item;
      const variant = selectedVariation(product, item.size, item.color);
      const price = selectionPrice(product, item.size, item.color);
      const image = variant?.image ?? product.images[0] ?? item.image;
      if (price === item.price && image === item.image && product.name === item.name) return item;
      changed = true;
      return { ...item, price, image, name: product.name };
    });
    if (changed) useCart.setState({ items: next });
  }, [products, items]);
  return null;
}