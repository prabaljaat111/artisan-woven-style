import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Save, CheckCircle2 } from "lucide-react";
import { Field, Section, PageHeader, ComingSoon } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/payment")({ head: () => ({ meta: adminPageMeta("Payment Settings") }), component: Page });

type V = { cod_enabled: boolean; cod_min: number; cod_max: number; cod_fee: number; razorpay_enabled: boolean; upi_enabled: boolean };
const DEFAULTS: V = { cod_enabled: true, cod_min: 0, cod_max: 50000, cod_fee: 0, razorpay_enabled: true, upi_enabled: true };

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("payment", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (value.cod_min < 0 || value.cod_max < value.cod_min || value.cod_fee < 0) return toast.error("Enter valid COD limits and a non-negative fee"); save(); }} className="max-w-4xl space-y-6">
      <PageHeader title="Payments" description="Manage payment methods customers can use at checkout." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Razorpay" description="Cards, UPI, netbanking, and wallets via Razorpay.">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/admin/settings/backup" className="text-primary underline">Check Razorpay connection status</Link>
        </div>
        <Toggle label="Enable Razorpay at checkout" hint="When off, the Razorpay option is hidden from the checkout page." checked={value.razorpay_enabled} onChange={(b) => set("razorpay_enabled", b)} />
      </Section>

      <Section title="UPI" description="UPI is available through Razorpay. Direct UPI transfers are not supported.">
        <p className="text-sm text-muted-foreground">Use the Razorpay switch above to enable or disable online payments.</p>
      </Section>

      <Section title="Cash on Delivery" description="Customer pays when the order is delivered.">
        <Toggle label="Enable COD" hint="When off, customers cannot select Cash on Delivery at checkout." checked={value.cod_enabled} onChange={(b) => set("cod_enabled", b)} />
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Min order (₹)" hint="Orders below this value cannot use COD."><input type="number" className={input} value={value.cod_min} onChange={(e) => set("cod_min", Number(e.target.value))} /></Field>
          <Field label="Max order (₹)" hint="Orders above this value cannot use COD."><input type="number" className={input} value={value.cod_max} onChange={(e) => set("cod_max", Number(e.target.value))} /></Field>
          <Field label="COD fee (₹)" hint="Added to the order as a handling charge for COD."><input type="number" className={input} value={value.cod_fee} onChange={(e) => set("cod_fee", Number(e.target.value))} /></Field>
        </div>
      </Section>

      <Section title="Stripe (international)">
        <ComingSoon title="Stripe for international cards" description="Will be enabled when you start shipping outside India." requires={["Stripe account in dashboard.stripe.com", "Currency conversion strategy"]} />
      </Section>

      <Section title="Transaction Logs" description="See every payment attempt and its status.">
        <Link to="/admin/orders" className="inline-flex text-sm text-primary underline">Open Orders →</Link>
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
      <button type="button" onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 ${checked ? "left-5" : "left-0.5"} h-5 w-5 bg-background rounded-full shadow transition-all`} />
      </button>
    </div>
  );
}