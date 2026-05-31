import { createFileRoute } from "@tanstack/react-router";
import { PolicyShell } from "@/components/PolicyShell";

export const Route = createFileRoute("/returns")({
  component: ReturnsPage,
  head: () => ({ meta: [{ title: "Returns & Exchange — Indian Handicraft Standards" }, { name: "description", content: "7-day return policy and exchange process." }], links: [{ rel: "canonical", href: "/returns" }] }),
});

function ReturnsPage() {
  return (
    <PolicyShell title="Returns & Exchange" eyebrow="Easy Returns">
      <p>We accept returns within <strong>7 days</strong> of delivery on unworn, unwashed items with original tags.</p>
      <h3>How to return</h3>
      <ol>
        <li>WhatsApp us at +91 90444 66957 with your order ID.</li>
        <li>We arrange a reverse pickup from your address (free for prepaid orders).</li>
        <li>Once we receive and inspect the item, refund is issued within 5–7 business days.</li>
      </ol>
      <h3>Non-returnable</h3>
      <ul>
        <li>Customised or altered pieces.</li>
        <li>Inner-wear, accessories and sale items.</li>
        <li>Items damaged due to misuse.</li>
      </ul>
      <h3>Exchanges</h3>
      <p>Size exchanges are free if requested within 7 days of delivery and the new size is in stock.</p>
    </PolicyShell>
  );
}