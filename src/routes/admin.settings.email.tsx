import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useState } from "react";
import { Field, PageHeader, Section } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/email")({ head: () => ({ meta: adminPageMeta("Email Settings") }), component: Page });

type Tpl = { subject: string; body: string; enabled: boolean };
type V = {
  from_name: string;
  from_email: string;
  reply_to: string;
  templates: {
    order_confirmation: Tpl;
    order_shipped: Tpl;
    order_delivered: Tpl;
    order_cancelled: Tpl;
    welcome: Tpl;
    abandoned_cart: Tpl;
  };
};

const t = (subject: string, body: string): Tpl => ({ subject, body, enabled: true });
const DEFAULTS: V = {
  from_name: "Indian Handicraft",
  from_email: "",
  reply_to: "",
  templates: {
    order_confirmation: t("Order #{{order_id}} confirmed", "Hi {{name}},\n\nThanks for your order! We'll let you know when it ships.\n\nOrder Total: ₹{{total}}"),
    order_shipped: t("Your order #{{order_id}} has shipped", "Hi {{name}},\n\nYour order is on its way. Track it here: {{tracking_url}}"),
    order_delivered: t("Order #{{order_id}} delivered", "Hi {{name}},\n\nYour order has been delivered. We hope you love it!"),
    order_cancelled: t("Order #{{order_id}} cancelled", "Hi {{name}},\n\nYour order has been cancelled. Refunds, if any, will be processed within 5-7 business days."),
    welcome: t("Welcome to Indian Handicraft", "Hi {{name}},\n\nWelcome! Explore our latest handcrafted ethnic wear."),
    abandoned_cart: t("You left something behind", "Hi {{name}},\n\nYour cart is waiting. Complete your order: {{cart_url}}"),
  },
};

const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
const TPL_LABELS: Record<keyof V["templates"], string> = {
  order_confirmation: "Order Confirmation",
  order_shipped: "Order Shipped",
  order_delivered: "Order Delivered",
  order_cancelled: "Order Cancelled",
  welcome: "Welcome",
  abandoned_cart: "Abandoned Cart",
};

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("email", DEFAULTS);
  const [active, setActive] = useState<keyof V["templates"]>("order_confirmation");
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const setTpl = (k: keyof V["templates"], patch: Partial<Tpl>) =>
    set("templates", { ...value.templates, [k]: { ...value.templates[k], ...patch } });
  const tpl = value.templates[active];
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-4xl space-y-6">
      <PageHeader title="Email" description="Sender identity and transactional templates." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />
      <Section title="Sender" description="Used as the From and Reply-To on every outgoing email.">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="From Name"><input className={input} value={value.from_name} onChange={(e) => set("from_name", e.target.value)} maxLength={60} /></Field>
          <Field label="From Email"><input type="email" className={input} value={value.from_email} onChange={(e) => set("from_email", e.target.value)} maxLength={120} /></Field>
          <Field label="Reply-To"><input type="email" className={input} value={value.reply_to} onChange={(e) => set("reply_to", e.target.value)} maxLength={120} /></Field>
        </div>
      </Section>
      <Section title="Templates" description="Use {{name}}, {{order_id}}, {{total}}, {{tracking_url}}, {{cart_url}} as merge tags.">
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(TPL_LABELS) as (keyof V["templates"])[]).map((k) => (
            <button key={k} type="button" onClick={() => setActive(k)}
              className={`text-xs px-3 py-1.5 rounded-full border ${active === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              {TPL_LABELS[k]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={tpl.enabled} onChange={(e) => setTpl(active, { enabled: e.target.checked })} />
          Send this email
        </label>
        <Field label="Subject"><input className={input} value={tpl.subject} onChange={(e) => setTpl(active, { subject: e.target.value })} maxLength={140} /></Field>
        <Field label="Body"><textarea rows={8} className={input + " font-mono"} value={tpl.body} onChange={(e) => setTpl(active, { body: e.target.value })} maxLength={4000} /></Field>
      </Section>
    </form>
  );
}
