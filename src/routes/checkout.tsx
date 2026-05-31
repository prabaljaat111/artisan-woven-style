import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart, priceBreakdown } from "@/store/cart";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { items, totalPrice, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [orderId, setOrderId] = useState("IHS00000");
  useEffect(() => {
    setMounted(true);
    setOrderId("IHS" + Math.floor(Math.random() * 100000));
  }, []);
  const { subtotal, shipping, gst, total } = priceBreakdown(totalPrice());
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl md:text-4xl text-primary text-center">Checkout</h1>
      <div className="flex justify-center gap-4 mt-6 text-xs uppercase tracking-wider">
        {["Address", "Payment", "Confirm"].map((s, i) => (
          <span key={s} className={step === (i + 1) ? "text-primary font-semibold" : "text-muted-foreground"}>{i + 1}. {s}</span>
        ))}
      </div>
      <div className="mt-8 bg-cream border border-border rounded-xl p-6">
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-3">
            <input required placeholder="Full name" className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input required placeholder="Phone" className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input required placeholder="Address" className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" className="border border-border rounded-md px-3 py-2 bg-background" />
              <input required placeholder="PIN code" className="border border-border rounded-md px-3 py-2 bg-background" />
            </div>
            <button className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium mt-2">Continue to Payment</button>
          </form>
        )}
        {step === 2 && (
          <div className="space-y-3">
            {["Cash on Delivery (recommended)", "UPI", "Card", "Net Banking"].map((m) => (
              <label key={m} className="flex items-center gap-3 border border-border rounded-md p-3 cursor-pointer hover:bg-secondary/50">
                <input type="radio" name="pay" defaultChecked={m.startsWith("Cash")} className="accent-primary" /> {m}
              </label>
            ))}
            <div className="bg-background border border-border rounded-md p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>GST (5%)</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : `₹${shipping}`}</span></div>
              <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-semibold text-primary"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
            </div>
            <button disabled={items.length === 0} onClick={() => { clear(); setStep(3); }} className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium mt-3 disabled:opacity-50">Place Order · ₹{total.toLocaleString("en-IN")}</button>
          </div>
        )}
        {step === 3 && (
          <div className="text-center py-6">
            <div className="text-5xl">🌸</div>
            <h2 className="font-display text-2xl text-primary mt-3">Order Confirmed!</h2>
            <p className="text-sm text-muted-foreground mt-2">Order ID: <span className="text-primary font-semibold">{orderId}</span></p>
            <p className="text-xs text-muted-foreground mt-4">A confirmation has been sent on WhatsApp.</p>
            <Link to="/shop" className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm">Continue Shopping</Link>
          </div>
        )}
      </div>
      {mounted && step !== 3 && items.length === 0 && <p className="text-center text-muted-foreground mt-6 text-sm">Your cart is empty. <Link to="/shop" className="text-gold">Shop now →</Link></p>}
    </div>
  );
}