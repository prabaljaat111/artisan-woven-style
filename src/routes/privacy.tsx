import { createFileRoute } from "@tanstack/react-router";
import { PolicyShell } from "@/components/PolicyShell";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ property: "og:title", content: "Privacy Policy \u2014 Indian Handicraft Standards" }, { property: "og:description", content: "How we collect, use and protect your data." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { title: "Privacy Policy — Indian Handicraft Standards" }, { name: "description", content: "How we collect, use and protect your data." }], links: [{ rel: "canonical", href: "https://indianhandicraftstandards.com/privacy" }] }),
});

function PrivacyPage() {
  return (
    <PolicyShell title="Privacy Policy" eyebrow="Your data, your control">
      <p>We respect your privacy. This policy explains what data we collect and how we use it.</p>
      <h3>What we collect</h3>
      <ul>
        <li>Contact details you provide (name, email, phone, shipping address).</li>
        <li>Order history and preferences.</li>
        <li>Anonymous analytics about how you use our site.</li>
      </ul>
      <h3>How we use it</h3>
      <ul>
        <li>To fulfil orders and provide customer support.</li>
        <li>To send transactional updates and (with consent) marketing messages.</li>
        <li>To improve product, service and site experience.</li>
      </ul>
      <h3>Your rights</h3>
      <p>You can request a copy of your data or deletion at any time by emailing privacy@indianhandicraftstandards.com.</p>
    </PolicyShell>
  );
}