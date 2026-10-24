import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, Section, PageHeader } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/notifications")({ head: () => ({ meta: adminPageMeta("Notifications Settings") }), component: Page });

type V = {
  recipients: string;
  new_orders: boolean;
  new_leads: boolean;
  low_inventory: boolean;
  failed_payments: boolean;
  customer_messages: boolean;
  return_requests: boolean;
};
const DEFAULTS: V = { recipients: "", new_orders: true, new_leads: true, low_inventory: true, failed_payments: true, customer_messages: true, return_requests: true };

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("notifications", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="Notification Center" description="What gets emailed to your team, and where." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Recipients">
        <Field label="Notify these emails" hint="Comma-separated list. All toggled events below are sent here."><input className={input} value={value.recipients} onChange={(e) => set("recipients", e.target.value)} placeholder="owner@yourstore.com, ops@yourstore.com" /></Field>
      </Section>

      <Section title="Events">
        <Toggle label="New orders" hint="Email on every paid or COD order." checked={value.new_orders} onChange={(b) => set("new_orders", b)} />
        <Toggle label="New leads" hint="Email when the chat widget or contact form captures a lead." checked={value.new_leads} onChange={(b) => set("new_leads", b)} />
        <Toggle label="Low inventory" hint="Uses the threshold from Inventory settings." checked={value.low_inventory} onChange={(b) => set("low_inventory", b)} />
        <Toggle label="Failed payments" hint="Razorpay verification failures." checked={value.failed_payments} onChange={(b) => set("failed_payments", b)} />
        <Toggle label="Customer messages" hint="Replies to support emails." checked={value.customer_messages} onChange={(b) => set("customer_messages", b)} />
        <Toggle label="Return requests" hint="Customer-initiated return or exchange." checked={value.return_requests} onChange={(b) => set("return_requests", b)} />
      </Section>
    </form>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="text-sm">
        <div className="font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <button type="button" onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 ${checked ? "left-5" : "left-0.5"} h-5 w-5 bg-background rounded-full shadow transition-all`} />
      </button>
    </div>
  );
}