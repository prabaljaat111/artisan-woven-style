import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyShell } from "@/components/PolicyShell";

export const Route = createFileRoute("/shipping")({
  component: ShippingPage,
  head: () => ({ meta: [{ property: "og:title", content: "Shipping Policy \u2014 Indian Handicraft Standards" }, { property: "og:description", content: "Shipping timelines, charges and tracking." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { title: "Shipping Policy — Indian Handicraft Standards" }, { name: "description", content: "Shipping timelines, charges and tracking." }], links: [{ rel: "canonical", href: "https://indianhandicraftstandards.com/shipping" }] }),
});

function ShippingPage() {
  return (
    <PolicyShell title="Shipping Policy" eyebrow="Logistics">
      <p>We dispatch orders within 2–4 business days from our Lucknow atelier.</p>
      <h3>Domestic shipping (India)</h3>
      <ul>
        <li>Free shipping on orders above ₹999.</li>
        <li>Standard delivery: 2–4 business days to metros; 4–7 days elsewhere.</li>
        <li>Cash on Delivery available up to ₹5,000.</li>
      </ul>
      <h3>International shipping</h3>
      <ul>
        <li>Shipped via DHL / Aramex.</li>
        <li>Delivery in 7–14 business days depending on destination.</li>
        <li>Customs duties (if any) are payable by the recipient.</li>
      </ul>
      <h3>Tracking</h3>
      <p>Once dispatched, you will receive an SMS, email and WhatsApp message with the tracking link. You can also use our <Link to="/track-order" className="text-primary underline">track order</Link> page.</p>
    </PolicyShell>
  );
}