import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, PageHeader, Section } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/order")({ head: () => ({ meta: adminPageMeta("Order Settings") }), component: Page });

type V = {
  cancellation_window_hrs: number;
  return_window_days: number;
  exchange_window_days: number;
  allow_exchange: boolean;
  allow_return: boolean;
  invoice_prefix: string;
  invoice_start: number;
  auto_confirm: boolean;
  notes_to_customer: string;
  terms: string;
};

const DEFAULTS: V = {
  cancellation_window_hrs: 24,
  return_window_days: 7,
  exchange_window_days: 7,
  allow_exchange: true,
  allow_return: true,
  invoice_prefix: "INV",
  invoice_start: 1001,
  auto_confirm: true,
  notes_to_customer: "Thank you for shopping with us!",
  terms: "Returns accepted in unworn, original condition with all tags attached.",
};

const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("order", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="Order Settings" description="Workflow, policies, and invoicing." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />
      <Section title="Workflow">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.auto_confirm} onChange={(e) => set("auto_confirm", e.target.checked)} /> Auto-confirm prepaid orders</label>
      </Section>
      <Section title="Cancellation & Returns">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Cancellation Window (hrs)" hint="Customer can cancel within this period."><input type="number" min={0} max={168} className={input} value={value.cancellation_window_hrs} onChange={(e) => set("cancellation_window_hrs", +e.target.value)} /></Field>
          <Field label="Return Window (days)"><input type="number" min={0} max={60} className={input} value={value.return_window_days} onChange={(e) => set("return_window_days", +e.target.value)} /></Field>
          <Field label="Exchange Window (days)"><input type="number" min={0} max={60} className={input} value={value.exchange_window_days} onChange={(e) => set("exchange_window_days", +e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.allow_return} onChange={(e) => set("allow_return", e.target.checked)} /> Allow returns</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.allow_exchange} onChange={(e) => set("allow_exchange", e.target.checked)} /> Allow exchanges</label>
      </Section>
      <Section title="Invoicing">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Invoice Prefix" hint={`Result: ${value.invoice_prefix}-${value.invoice_start}`}><input className={input} value={value.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value.toUpperCase())} maxLength={8} /></Field>
          <Field label="Starting Number"><input type="number" min={1} className={input} value={value.invoice_start} onChange={(e) => set("invoice_start", +e.target.value)} /></Field>
        </div>
        <Field label="Customer Note" hint="Shown on the invoice."><textarea rows={2} className={input} value={value.notes_to_customer} onChange={(e) => set("notes_to_customer", e.target.value)} maxLength={300} /></Field>
        <Field label="Terms & Conditions"><textarea rows={3} className={input} value={value.terms} onChange={(e) => set("terms", e.target.value)} maxLength={1000} /></Field>
      </Section>
    </form>
  );
}
