import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart, priceBreakdown } from "@/store/cart";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { items, removeItem, updateQty, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { subtotal, shipping, gst, total } = priceBreakdown(totalPrice());
  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl md:text-4xl text-primary text-center">Your Cart</h1>
        <div className="gold-underline w-20 mx-auto mt-3 mb-8" />
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      </div>
    );
  }
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl md:text-4xl text-primary text-center">Your Cart</h1>
      <div className="gold-underline w-20 mx-auto mt-3 mb-8" />
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link to="/shop" className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm">Continue Shopping</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-4">
            {items.map((i) => (
              <div key={`${i.id}|${i.size}|${i.color}`} className="flex gap-4 bg-cream border border-border rounded-xl p-3">
                <img src={i.image} alt={i.name} className="h-24 w-20 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <Link to="/product/$slug" params={{ slug: i.slug }} className="font-display text-sm text-primary line-clamp-2">{i.name}</Link>
                  <p className="text-xs text-muted-foreground mt-1">{i.size} · {i.color}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-border rounded-md text-sm">
                      <button onClick={() => updateQty(i.id, i.size, i.color, i.qty - 1)} className="h-8 w-8">−</button>
                      <span className="w-8 text-center">{i.qty}</span>
                      <button onClick={() => updateQty(i.id, i.size, i.color, i.qty + 1)} className="h-8 w-8">+</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary">₹{(i.price * i.qty).toLocaleString("en-IN")}</span>
                      <button onClick={() => removeItem(i.id, i.size, i.color)} aria-label="Remove"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="bg-cream border border-border rounded-xl p-5 h-fit sticky top-24">
            <h2 className="font-display text-lg text-primary mb-4">Order Summary</h2>
            <div className="flex gap-2 mb-4">
              <input placeholder="Coupon code" className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background" />
              <button className="bg-secondary text-foreground px-3 rounded-md text-sm">Apply</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>GST (5%)</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : `₹${shipping}`}</span></div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold text-base text-primary"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
            </div>
            <Link to="/checkout" className="mt-5 block text-center bg-primary text-primary-foreground py-3 rounded-full font-medium">Checkout</Link>
            <Link to="/shop" className="block text-center text-xs text-muted-foreground mt-3">Continue Shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}