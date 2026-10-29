import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, PageHeader, Section } from "@/components/admin/SettingsField";
import { GrowthTools } from "@/components/admin/GrowthTools";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/customer")({ head: () => ({ meta: adminPageMeta("Customer Settings") }), component: Page });

type V = {
  allow_signup: boolean;
  allow_guest_checkout: boolean;
  enable_wishlist: boolean;
  enable_reviews: boolean;
  enable_google_login: boolean;
  enable_otp_login: boolean;
  require_phone_verify: boolean;
  min_order_value: number;
};

const DEFAULTS: V = {
  allow_signup: true,
  allow_guest_checkout: true,
  enable_wishlist: true,
  enable_reviews: true,
  enable_google_login: true,
  enable_otp_login: false,
  require_phone_verify: false,
  min_order_value: 0,
};

const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("customer", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const toggle = (label: string, hint: string, k: keyof V) => (
    <label className="flex items-start gap-3 text-sm py-2 border-b border-border last:border-0">
      <input type="checkbox" className="mt-1" checked={!!value[k]} onChange={(e) => set(k, e.target.checked as V[typeof k])} />
      <span><span className="font-medium">{label}</span><div className="text-xs text-muted-foreground">{hint}</div></span>
    </label>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="Customer Settings" description="Account, auth, and checkout rules." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />
      <Section title="Account">
        {toggle("Allow new sign-ups", "Customers can create accounts.", "allow_signup")}
        {toggle("Allow guest checkout", "Customers can place an order without registering.", "allow_guest_checkout")}
        {toggle("Enable wishlist", "Show heart icons and the wishlist page.", "enable_wishlist")}
        {toggle("Enable product reviews", "Customers can rate and review purchased products.", "enable_reviews")}
      </Section>
      <Section title="Authentication">
        {toggle("Google login", "Show Sign in with Google on the auth page.", "enable_google_login")}
        {toggle("OTP login (SMS)", "Phone OTP login. Requires SMS provider integration.", "enable_otp_login")}
        {toggle("Require phone verification", "Customers must verify phone before placing an order.", "require_phone_verify")}
      </Section>
      <Section title="Checkout Rules">
        <Field label="Minimum Order Value (₹)" hint="0 means no minimum."><input type="number" min={0} className={input} value={value.min_order_value} onChange={(e) => set("min_order_value", +e.target.value)} /></Field>
      </Section>
      <Section title="Loyalty & Groups">
        <GrowthTools mode="loyalty" />
      </Section>
    </form>
  );
}
