import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
  head: () => ({
    meta: [
      { title: "FAQs — Indian Handicraft Standards" },
      { name: "description", content: "Answers about Chikankari fabric, sizing, shipping, returns and authenticity." },
      { property: "og:title", content: "Frequently Asked Questions" },
      { property: "og:description", content: "Everything you need to know before ordering." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    }],
  }),
});

const faqs = [
  { q: "Is the embroidery genuinely hand-done?", a: "Yes. Every piece is hand-embroidered by master karigars in Lucknow. We work directly with artisan clusters to ensure fair wages and authentic craft." },
  { q: "What fabrics do you use?", a: "Primarily pure cotton, mul-cotton, georgette, rayon and chanderi. Each product page lists the exact fabric and care instructions." },
  { q: "How do I choose the right size?", a: "Use the size guide on each product page. When in doubt, message us on WhatsApp with your bust/waist/hip measurements — we'll recommend a size." },
  { q: "Do you ship internationally?", a: "Yes. We ship worldwide via DHL and Aramex. International orders are dispatched within 3–5 business days." },
  { q: "What is your return policy?", a: "Unworn items can be returned within 7 days of delivery for a refund or store credit. Customised/altered pieces are non-returnable." },
  { q: "Do you offer Cash on Delivery?", a: "Yes, COD is available across India on orders below ₹5,000." },
  { q: "How long does delivery take?", a: "Metro cities 2–4 business days; rest of India 4–7 days; international 7–14 days." },
  { q: "How should I care for Chikankari?", a: "Gentle cold hand-wash separately. Dry in shade. Iron on reverse on medium heat. Avoid bleach and harsh detergents." },
  { q: "Do you take custom or bulk orders?", a: "Absolutely. WhatsApp us with your requirement — we offer custom embroidery, sizing and bulk pricing for weddings & boutiques." },
  { q: "Are colours exactly as shown?", a: "We try our best, but slight variation may occur due to screen calibration and natural dyes." },
];

function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Help Center</p>
        <h1 className="font-display italic text-4xl md:text-5xl text-primary mt-2">Frequently Asked Questions</h1>
        <div className="gold-underline w-24 mx-auto mt-3" />
      </div>
      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border border-border rounded-xl px-4 bg-card">
            <AccordionTrigger className="text-left text-sm md:text-base font-medium text-foreground hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="text-center text-sm text-muted-foreground mt-8">
        Still have questions? <a href="https://wa.me/919044466957" target="_blank" rel="noreferrer" className="text-primary underline">Chat with us on WhatsApp</a>
      </p>
    </div>
  );
}