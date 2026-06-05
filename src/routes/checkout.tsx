import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart, priceBreakdown } from "@/store/cart";
import { createOrder } from "@/lib/orders.functions";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { checkServiceability } from "@/lib/shiprocket.functions";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface AddressForm {
  name: string;
  email: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

function CheckoutPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { items, totalPrice, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [serviceCheck, setServiceCheck] = useState<{
    checking: boolean;
    result: null | {
      serviceable: boolean;
      cheapest: { name: string; rate: number; days: string } | null;
      fastest: { name: string; rate: number; days: string } | null;
      error?: string;
    };
  }>({ checking: false, result: null });
  const [address, setAddress] = useState<AddressForm>({
    name: "", email: "", phone: "", line1: "", city: "", state: "", pincode: "",
  });
  useEffect(() => { setMounted(true); }, []);
  const { subtotal, shipping, gst, total } = priceBreakdown(totalPrice());
  const phoneValid = /^[6-9]\d{9}$/.test(address.phone.replace(/\D/g, ""));
  const pinValid = /^\d{6}$/.test(address.pincode);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim());
  const serviceable = serviceCheck.result?.serviceable !== false;
  const canContinue = phoneValid && pinValid && emailValid && address.name.trim().length >= 2 && address.line1.trim().length >= 5 && address.city.trim().length >= 2 && serviceable && !serviceCheck.checking;

  // Auto-check serviceability when PIN is 6 digits
  useEffect(() => {
    if (!/^\d{6}$/.test(address.pincode)) {
      setServiceCheck({ checking: false, result: null });
      return;
    }
    let cancelled = false;
    setServiceCheck({ checking: true, result: null });
    const t = setTimeout(async () => {
      try {
        const r = await checkServiceability({
          data: { delivery_postcode: address.pincode, cod: false, declared_value: total },
        });
        if (!cancelled) setServiceCheck({ checking: false, result: r });
      } catch (e) {
        if (!cancelled)
          setServiceCheck({
            checking: false,
            result: { serviceable: false, cheapest: null, fastest: null, error: e instanceof Error ? e.message : "Failed" },
          });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [address.pincode, total]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) { setError("Your cart is empty."); return; }
    setError(null);
    setProcessing(true);
    try {
      const orderItems = items.map((i) => ({
        product_id: null,
        product_name: i.name,
        product_slug: i.slug,
        image: i.image,
        size: i.size,
        color: i.color,
        qty: i.qty,
        price: i.price,
      }));
      const created = await createOrder({
        data: {
          customer_name: address.name,
          customer_email: address.email,
          customer_phone: address.phone,
          shipping_address: {
            line1: address.line1,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: "India",
          },
          items: orderItems,
          payment_method: paymentMethod,
          coupon_code: coupon.trim() ? coupon.trim().toUpperCase() : null,
        },
      });

      if (paymentMethod === "cod") {
        setOrderNumber(created.order_number);
        clear();
        setStep(3);
        return;
      }

      // Razorpay flow
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Unable to load payment gateway");

      const rzp = await createRazorpayOrder({
        data: { order_id: created.id, amount: Math.round(created.total * 100) },
      });

      await new Promise<void>((resolve, reject) => {
        const inst = new window.Razorpay!({
          key: rzp.key_id,
          amount: rzp.amount,
          currency: rzp.currency,
          name: "Indian Handicraft Standards",
          description: `Order ${rzp.order_number ?? ""}`,
          order_id: rzp.razorpay_order_id,
          prefill: {
            name: address.name,
            email: address.email,
            contact: address.phone,
          },
          theme: { color: "#1f3d2b" },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const v = await verifyRazorpayPayment({
                data: {
                  order_id: created.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              setOrderNumber(v.order_number ?? created.order_number);
              clear();
              setStep(3);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        });
        inst.open();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

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
          <form onSubmit={(e) => { e.preventDefault(); if (canContinue) setStep(2); }} className="space-y-3">
            <input required value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} placeholder="Full name" autoComplete="name" className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input required type="email" value={address.email} onChange={(e) => setAddress({ ...address, email: e.target.value })} placeholder="Email" autoComplete="email" inputMode="email" className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input required value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit mobile number" autoComplete="tel" inputMode="numeric" maxLength={10} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            {address.phone.length > 0 && !phoneValid && <p className="text-xs text-amber-700">Enter a valid 10-digit Indian mobile number.</p>}
            <input required value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Address (House no, street, area)" autoComplete="street-address" className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <div className="grid grid-cols-3 gap-3">
              <input required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" autoComplete="address-level2" className="border border-border rounded-md px-3 py-2 bg-background" />
              <input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="State" autoComplete="address-level1" className="border border-border rounded-md px-3 py-2 bg-background" />
              <input required value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="PIN code" autoComplete="postal-code" inputMode="numeric" maxLength={6} className="border border-border rounded-md px-3 py-2 bg-background" />
            </div>
            {serviceCheck.checking && (
              <div className="text-xs text-muted-foreground">Checking delivery to {address.pincode}…</div>
            )}
            {serviceCheck.result && !serviceCheck.checking && (
              serviceCheck.result.serviceable && serviceCheck.result.cheapest ? (
                <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md p-2.5 space-y-0.5">
                  <div className="font-semibold">✓ Delivers to {address.pincode}</div>
                  <div>Cheapest: {serviceCheck.result.cheapest.name} · ₹{serviceCheck.result.cheapest.rate} · {serviceCheck.result.cheapest.days} days</div>
                  {serviceCheck.result.fastest && serviceCheck.result.fastest.name !== serviceCheck.result.cheapest.name && (
                    <div>Fastest: {serviceCheck.result.fastest.name} · ₹{serviceCheck.result.fastest.rate} · {serviceCheck.result.fastest.days} days</div>
                  )}
                </div>
              ) : (
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-2.5">
                  Delivery to {address.pincode} unavailable right now. Try another PIN or contact us.
                </div>
              )
            )}
            <button disabled={!canContinue} className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed">Continue to Payment</button>
          </form>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <button type="button" onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-primary">← Edit address</button>
            <div className="bg-background border border-border rounded-md p-3 text-xs">
              <p className="font-medium text-primary">Shipping to</p>
              <p className="text-muted-foreground mt-0.5">{address.name} · {address.phone}</p>
              <p className="text-muted-foreground">{address.line1}, {address.city} {address.state} {address.pincode}</p>
            </div>
            <label className="flex items-center gap-3 border border-border rounded-md p-3 cursor-pointer hover:bg-secondary/50">
              <input type="radio" name="pay" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} className="accent-primary" />
              <span><span className="font-medium">Pay Online</span> <span className="text-xs text-muted-foreground">— UPI, Cards, Net Banking, Wallets (via Razorpay)</span></span>
            </label>
            <label className="flex items-center gap-3 border border-border rounded-md p-3 cursor-pointer hover:bg-secondary/50">
              <input type="radio" name="pay" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="accent-primary" />
              <span className="font-medium">Cash on Delivery</span>
            </label>
            <div className="bg-background border border-border rounded-md p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>GST (5%)</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : `₹${shipping}`}</span></div>
              <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-semibold text-primary"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
            </div>
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Coupon code (optional)"
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background uppercase"
              />
            </div>
            {coupon.trim() && (
              <p className="text-xs text-muted-foreground">Coupon will be validated and applied at payment.</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={items.length === 0 || processing}
              onClick={handlePlaceOrder}
              className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium mt-3 disabled:opacity-50"
            >
              {processing ? "Processing…" : paymentMethod === "razorpay" ? `Pay ₹${total.toLocaleString("en-IN")}` : `Place Order · ₹${total.toLocaleString("en-IN")}`}
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="text-center py-6">
            <div className="text-5xl">🌸</div>
            <h2 className="font-display text-2xl text-primary mt-3">Order Confirmed!</h2>
            <p className="text-sm text-muted-foreground mt-2">Order ID: <span className="text-primary font-semibold">{orderNumber}</span></p>
            <p className="text-xs text-muted-foreground mt-4">A confirmation has been sent on WhatsApp.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Link to="/track-order" className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm">Track Order</Link>
              <Link to="/shop" className="border border-primary text-primary px-6 py-3 rounded-full text-sm">Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
      {mounted && step !== 3 && items.length === 0 && <p className="text-center text-muted-foreground mt-6 text-sm">Your cart is empty. <Link to="/shop" className="text-gold">Shop now →</Link></p>}
    </div>
  );
}