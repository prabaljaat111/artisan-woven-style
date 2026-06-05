import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { trackOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/track-order")({
  component: TrackOrderPage,
  head: () => ({
    meta: [
      { title: "Track Your Order — Indian Handicraft Standards" },
      { name: "description", content: "Track the status of your Chikankari order in real time." },
      { property: "og:title", content: "Track Your Order" },
      { property: "og:url", content: "/track-order" },
    ],
    links: [{ rel: "canonical", href: "/track-order" }],
  }),
});

function TrackOrderPage() {
  type TrackResult = {
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    tracking_number: string | null;
    tracking_url: string | null;
    created_at: string;
    customer_name: string;
    shipping_address: { line1?: string; city?: string; state?: string; pincode?: string } | null;
  };
  const [tracking, setTracking] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const track = useServerFn(trackOrder);
  const steps = [
    { label: "Order placed", icon: CheckCircle2 },
    { label: "Packed", icon: Package },
    { label: "Out for delivery", icon: Truck },
    { label: "Delivered", icon: CheckCircle2 },
  ];
  const statusIndex = (s: string): number => {
    const v = (s ?? "").toLowerCase();
    if (v === "delivered") return 3;
    if (v === "shipped" || v === "out_for_delivery") return 2;
    if (v === "paid" || v === "packed" || v === "processing") return 1;
    return 0;
  };
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Order Status</p>
        <h1 className="font-display italic text-3xl md:text-4xl text-primary mt-2">Track your order</h1>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const id = (form.elements.namedItem("orderId") as HTMLInputElement).value.trim();
          const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
          setLoading(true);
          setError(null);
          setTracking(null);
          try {
            const r = await track({ data: { order_number: id, email } });
            setTracking(r as TrackResult);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not find this order");
          } finally {
            setLoading(false);
          }
        }}
        className="bg-card border border-border rounded-2xl p-5 space-y-3"
      >
        <input name="orderId" required placeholder="Order ID (e.g. IHS-10245)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
        <input name="email" required type="email" placeholder="Email used at checkout" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
        <button disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
          {loading ? "Looking up…" : "Track order"}
        </button>
        {error && <p className="text-sm text-red-600 text-center pt-1">{error}</p>}
      </form>
      {tracking && (
        <div className="mt-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="font-display text-lg text-primary">{tracking.order_number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Placed {new Date(tracking.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <span className="text-xs bg-accent/10 text-accent font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5 capitalize">
              <Clock className="h-3 w-3" /> {tracking.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {steps.map((s, i) => {
              const done = i <= statusIndex(tracking.status);
              return (
                <div key={i} className="text-center">
                  <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className={`text-[11px] mt-2 ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-border text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{tracking.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">₹{Number(tracking.total).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{tracking.payment_status}</span></div>
            {tracking.shipping_address?.city && (
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping to</span><span className="text-right">{tracking.shipping_address.city}, {tracking.shipping_address.pincode}</span></div>
            )}
            {tracking.tracking_number && (
              <div className="flex justify-between"><span className="text-muted-foreground">AWB</span><span className="font-mono text-xs">{tracking.tracking_number}</span></div>
            )}
            {tracking.tracking_url && (
              <a href={tracking.tracking_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-gold underline">
                View live courier tracking →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}