import { createFileRoute } from "@tanstack/react-router";
import { PolicyShell } from "@/components/PolicyShell";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({ meta: [{ property: "og:title", content: "Terms of Service \u2014 Indian Handicraft Standards" }, { property: "og:description", content: "Terms governing the use of this site and purchases." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { title: "Terms of Service — Indian Handicraft Standards" }, { name: "description", content: "Terms governing the use of this site and purchases." }], links: [{ rel: "canonical", href: "https://indianhandicraftstandards.com/terms" }] }),
});

function TermsPage() {
  return (
    <PolicyShell title="Terms of Service" eyebrow="The fine print">
      <p>By using this site you agree to the following terms.</p>
      <h3>Use of site</h3>
      <p>All content, imagery and designs are property of Indian Handicraft Standards. Unauthorised reproduction is prohibited.</p>
      <h3>Orders</h3>
      <p>We reserve the right to cancel orders in case of pricing errors, fraud or stock issues. Full refund is issued in such cases.</p>
      <h3>Liability</h3>
      <p>We are not liable for indirect damages arising from use of our products. Hand-embroidery may show minor variations — this is a sign of authenticity, not a defect.</p>
      <h3>Jurisdiction</h3>
      <p>All disputes are subject to the jurisdiction of courts in Lucknow, Uttar Pradesh, India.</p>
    </PolicyShell>
  );
}