import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Facebook, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", topic: "Order enquiry", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();
    const whatsapp = form.whatsapp.trim();
    if (name.length < 2) return toast.error("Please enter your name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Please enter a valid email");
    if (message.length < 5) return toast.error("Please write a short message");
    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name,
        phone: whatsapp || email,
        whatsapp: whatsapp || null,
        interest: form.topic,
        page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
        source: "contact",
        status: "new",
        notes: `Email: ${email}\nTopic: ${form.topic}\n\n${message}`,
        conversation: [],
      });
      if (error) throw error;
      setSent(true);
      toast.success("Message sent — we'll reply within 24h");
      setForm({ name: "", email: "", whatsapp: "", topic: "Order enquiry", message: "" });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't send right now. Please WhatsApp us instead.");
    } finally {
      setSubmitting(false);
    }
  }
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
            { icon: MessageCircle, label: "WhatsApp", value: "+91 90444 66957", href: "https://wa.me/919044466957" },
            { icon: Phone, label: "Call us", value: "+91 90444 66957", href: "tel:+919044466957" },
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
        {sent ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl">✓</div>
            <h2 className="font-display text-2xl text-primary mt-4">Message received</h2>
            <p className="text-sm text-muted-foreground mt-2">We'll reply within 24 hours. For instant help, WhatsApp us anytime.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-5">
              <a href="https://wa.me/919044466957" target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-5 py-2.5 rounded-full text-sm font-medium">WhatsApp now</a>
              <button type="button" onClick={() => setSent(false)} className="border border-primary text-primary px-5 py-2.5 rounded-full text-sm font-medium">Send another</button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3"
          >
            <h2 className="font-display text-xl text-primary">Send us a message</h2>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} placeholder="Your name" autoComplete="name" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
            <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} maxLength={200} placeholder="Email" autoComplete="email" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
            <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/[^\d+\s]/g, "") }))} maxLength={24} inputMode="tel" autoComplete="tel" placeholder="WhatsApp number (optional)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
            <select value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background">
              <option>Order enquiry</option>
              <option>Sizing help</option>
              <option>Custom order</option>
              <option>Wholesale / Bulk</option>
              <option>Other</option>
            </select>
            <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} maxLength={1500} placeholder="How can we help?" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{form.message.length}/1500</span>
              <span>We reply within 24h</span>
            </div>
            <button disabled={submitting} className="w-full bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60">
              {submitting ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}