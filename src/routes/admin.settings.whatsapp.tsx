import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, Section, PageHeader } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/whatsapp")({ component: Page });

type V = {
  phone: string;
  greeting: string;
  order_template: string;
  shipping_template: string;
  lead_template: string;
  support_routing_number: string;
};

const DEFAULTS: V = {
  phone: "",
  greeting: "Hi! Thanks for reaching out to Indian Handicraft. How can we help?",
  order_template: "Hi {{name}}, your order #{{order}} for ₹{{total}} is confirmed. We'll share tracking soon.",
  shipping_template: "Your order #{{order}} has shipped via {{courier}}. AWB: {{awb}}. Track: {{tracking_url}}",
  lead_template: "New lead: {{name}} · {{phone}} · interested in {{interest}}",
  support_routing_number: "",
};

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("whatsapp", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="WhatsApp" description="Number used by the floating chat widget and templates for order, shipping, and lead alerts." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Business Number" description="Used by the floating WhatsApp chat widget on every storefront page.">
        <Field label="WhatsApp Number" hint="With country code, no spaces. Example: 919999999999"><input className={input} value={value.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="91XXXXXXXXXX" /></Field>
        <Field label="Greeting message" hint="Auto-prefilled when a customer taps the chat widget."><textarea rows={2} className={input} value={value.greeting} onChange={(e) => set("greeting", e.target.value)} maxLength={300} /></Field>
      </Section>

      <Section title="Automated Templates" description="Variables in {{double braces}} are replaced when sent.">
        <Field label="Order confirmation" hint="Variables: {{name}}, {{order}}, {{total}}"><textarea rows={3} className={input} value={value.order_template} onChange={(e) => set("order_template", e.target.value)} maxLength={500} /></Field>
        <Field label="Shipping update" hint="Variables: {{name}}, {{order}}, {{courier}}, {{awb}}, {{tracking_url}}"><textarea rows={3} className={input} value={value.shipping_template} onChange={(e) => set("shipping_template", e.target.value)} maxLength={500} /></Field>
        <Field label="New lead alert" hint="Sent to support routing number when a new lead arrives."><textarea rows={3} className={input} value={value.lead_template} onChange={(e) => set("lead_template", e.target.value)} maxLength={500} /></Field>
      </Section>

      <Section title="Customer Support Routing">
        <Field label="Support routing number" hint="Team number that receives lead alerts. Leave blank to use the business number."><input className={input} value={value.support_routing_number} onChange={(e) => set("support_routing_number", e.target.value)} maxLength={20} placeholder="91XXXXXXXXXX" /></Field>
      </Section>
    </form>
  );
}