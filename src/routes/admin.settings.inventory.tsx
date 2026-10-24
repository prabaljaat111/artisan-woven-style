import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, Section, PageHeader } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/inventory")({ head: () => ({ meta: adminPageMeta("Inventory Settings") }), component: Page });

type V = {
  low_stock_threshold: number;
  out_of_stock_behavior: "hide" | "show" | "backorder";
  notify_low_stock: boolean;
  notify_out_of_stock: boolean;
  notify_emails: string;
};

const DEFAULTS: V = { low_stock_threshold: 5, out_of_stock_behavior: "show", notify_low_stock: true, notify_out_of_stock: true, notify_emails: "" };

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("inventory", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="Inventory" description="Stock thresholds, out-of-stock behavior, and alert recipients." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Stock Levels">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Low stock threshold" hint="Products with stock at or below this number show as 'Low' in admin and trigger alerts."><input type="number" min={0} className={input} value={value.low_stock_threshold} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} /></Field>
          <Field label="Out-of-stock behavior" hint="What customers see when a product hits zero stock.">
            <select className={input} value={value.out_of_stock_behavior} onChange={(e) => set("out_of_stock_behavior", e.target.value as V["out_of_stock_behavior"])}>
              <option value="show">Show as 'Out of stock' (recommended)</option>
              <option value="hide">Hide from storefront</option>
              <option value="backorder">Allow backorder (accept the order anyway)</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Alerts">
        <Toggle label="Email me when a product is low" checked={value.notify_low_stock} onChange={(b) => set("notify_low_stock", b)} />
        <Toggle label="Email me when a product is out of stock" checked={value.notify_out_of_stock} onChange={(b) => set("notify_out_of_stock", b)} />
        <Field label="Recipient emails" hint="Comma-separated. Leave blank to use the general contact email."><input className={input} value={value.notify_emails} onChange={(e) => set("notify_emails", e.target.value)} placeholder="ops@yourstore.com, owner@yourstore.com" /></Field>
      </Section>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 ${checked ? "left-5" : "left-0.5"} h-5 w-5 bg-background rounded-full shadow transition-all`} />
      </button>
    </label>
  );
}