import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Facebook, Youtube } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Us — Indian Handicraft Standards" },
      { name: "description", content: "Get in touch with our Lucknow atelier. WhatsApp, phone, email and concierge support." },
      { property: "og:title", content: "Contact — Indian Handicraft Standards" },
      { property: "og:description", content: "Reach our team for orders, sizing and custom requests." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Get in Touch</p>
        <h1 className="font-display italic text-4xl md:text-5xl text-primary mt-2">We'd love to hear from you</h1>
        <div className="gold-underline w-24 mx-auto mt-3" />
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {[
            { icon: MessageCircle, label: "WhatsApp", value: "+91 99999 99999", href: "https://wa.me/919999999999" },
            { icon: Phone, label: "Call us", value: "+91 99999 99999", href: "tel:+919999999999" },
            { icon: Mail, label: "Email", value: "hello@indianhandicraftstandards.com", href: "mailto:hello@indianhandicraftstandards.com" },
            { icon: MapPin, label: "Atelier", value: "Chowk, Lucknow, Uttar Pradesh, India 226003" },
            { icon: Instagram, label: "Instagram", value: "@indian_handicraft_standards", href: "https://www.instagram.com/indian_handicraft_standards" },
            { icon: Facebook, label: "Facebook", value: "Indian Handicraft Standards", href: "https://www.facebook.com/share/18gmkPS1C4/" },
            { icon: Youtube, label: "YouTube", value: "@indianhandicraftstandards8147", href: "http://www.youtube.com/@indianhandicraftstandards8147" },
          ].map((c) => (
            <a key={c.label} href={c.href ?? "#"} target={c.href ? "_blank" : undefined} rel="noreferrer" className="flex items-start gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary transition">
              <c.icon className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <div className="text-sm font-medium text-foreground">{c.value}</div>
              </div>
            </a>
          ))}
          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3">
            Support hours: Mon–Sat, 10am – 7pm IST
          </div>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3"
        >
          <h2 className="font-display text-xl text-primary">Send us a message</h2>
          <input required placeholder="Your name" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
          <input required type="email" placeholder="Email" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
          <input placeholder="WhatsApp number (optional)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
          <select className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background">
            <option>Order enquiry</option>
            <option>Sizing help</option>
            <option>Custom order</option>
            <option>Wholesale / Bulk</option>
            <option>Other</option>
          </select>
          <textarea required rows={5} placeholder="How can we help?" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
          <button className="w-full bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition">
            {sent ? "✓ Message sent — we'll reply within 24h" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}