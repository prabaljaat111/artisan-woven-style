import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Truck, CheckCircle2, Clock } from "lucide-react";

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
  const [tracking, setTracking] = useState<null | { id: string; status: number }>(null);
  const steps = [
    { label: "Order placed", icon: CheckCircle2 },
    { label: "Packed", icon: Package },
    { label: "Out for delivery", icon: Truck },
    { label: "Delivered", icon: CheckCircle2 },
  ];
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Order Status</p>
        <h1 className="font-display italic text-3xl md:text-4xl text-primary mt-2">Track your order</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const id = (form.elements.namedItem("orderId") as HTMLInputElement).value;
          setTracking({ id, status: 2 });
        }}
        className="bg-card border border-border rounded-2xl p-5 space-y-3"
      >
        <input name="orderId" required placeholder="Order ID (e.g. IHS-10245)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
        <input required type="email" placeholder="Email used at checkout" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
        <button className="w-full bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium hover:bg-primary/90">Track order</button>
      </form>
      {tracking && (
        <div className="mt-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="font-display text-lg text-primary">{tracking.id}</p>
            </div>
            <span className="text-xs bg-accent/10 text-accent font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> Arriving Fri, May 30</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {steps.map((s, i) => {
              const done = i <= tracking.status;
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
        </div>
      )}
    </div>
  );
}