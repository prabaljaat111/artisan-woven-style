import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, CheckCircle2 } from "lucide-react";
import { adminGetShiprocketSettings, adminUpdateShiprocketSettings } from "@/lib/shiprocket.functions";
import { Field, Section, PageHeader, ComingSoon } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/shipping")({ head: () => ({ meta: adminPageMeta("Shipping Settings") }), component: Page });

interface SrSettings {
  pickup_location: string;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  weight_kg: number;
  pickup_pincode?: string;
}

type Extra = { free_shipping_threshold: number; flat_rate: number };
const DEFAULTS_EXTRA: Extra = { free_shipping_threshold: 999, flat_rate: 79 };

function Page() {
  const [sr, setSr] = useState<SrSettings>({ pickup_location: "Primary", length_cm: 25, breadth_cm: 20, height_cm: 5, weight_kg: 0.5, pickup_pincode: "226003" });
  const [loadingSr, setLoadingSr] = useState(true);
  const [savingSr, setSavingSr] = useState(false);
  const extra = useSetting<Extra>("shipping.rules", DEFAULTS_EXTRA);

  useEffect(() => {
    adminGetShiprocketSettings()
      .then((s) => setSr((prev) => ({ ...prev, ...(s as SrSettings) })))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoadingSr(false));
  }, []);

  async function saveSr() {
    setSavingSr(true);
    try { await adminUpdateShiprocketSettings({ data: sr }); toast.success("Shiprocket defaults saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSavingSr(false); }
  }

  if (loadingSr || extra.loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Shipping" description="Shiprocket integration, parcel defaults, and free-shipping rules." />

      <Section title="Shiprocket Integration" description="Live serviceability, AWB assignment, label/invoice generation.">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/admin/settings/backup" className="text-primary underline">Check Shiprocket connection status</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Pickup Location Nickname" hint="Exact nickname from Shiprocket → Settings → Pickup Addresses."><input className={input} value={sr.pickup_location} onChange={(e) => setSr({ ...sr, pickup_location: e.target.value })} required maxLength={80} /></Field>
          <Field label="Pickup PIN" hint="Used for serviceability checks at checkout."><input className={input} value={sr.pickup_pincode ?? ""} onChange={(e) => setSr({ ...sr, pickup_pincode: e.target.value })} pattern="\d{6}" maxLength={6} /></Field>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Default Parcel Dimensions</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Length (cm)"><input type="number" className={input} value={sr.length_cm} onChange={(e) => setSr({ ...sr, length_cm: Number(e.target.value) })} /></Field>
            <Field label="Breadth (cm)"><input type="number" className={input} value={sr.breadth_cm} onChange={(e) => setSr({ ...sr, breadth_cm: Number(e.target.value) })} /></Field>
            <Field label="Height (cm)"><input type="number" className={input} value={sr.height_cm} onChange={(e) => setSr({ ...sr, height_cm: Number(e.target.value) })} /></Field>
            <Field label="Weight (kg)"><input type="number" step="0.05" className={input} value={sr.weight_kg} onChange={(e) => setSr({ ...sr, weight_kg: Number(e.target.value) })} /></Field>
          </div>
        </div>
        <button onClick={saveSr} disabled={savingSr} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {savingSr ? "Saving…" : "Save Shiprocket defaults"}
        </button>
      </Section>

      <Section title="Shipping Charges" description="Applied at checkout when Shiprocket rates aren't available.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Flat shipping rate (₹)" hint="Fallback charge used when courier rate lookup fails."><input type="number" className={input} value={extra.value.flat_rate} onChange={(e) => extra.setValue({ ...extra.value, flat_rate: Number(e.target.value) })} /></Field>
          <Field label="Free shipping above (₹)" hint="Orders with subtotal above this amount get free shipping."><input type="number" className={input} value={extra.value.free_shipping_threshold} onChange={(e) => extra.setValue({ ...extra.value, free_shipping_threshold: Number(e.target.value) })} /></Field>
        </div>
        <button onClick={() => { if (extra.value.flat_rate < 0 || extra.value.free_shipping_threshold < 0) return toast.error("Shipping amounts cannot be negative"); extra.save(); }} disabled={extra.saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {extra.saving ? "Saving…" : "Save shipping rules"}
        </button>
      </Section>

      <Section title="Shipping Zones & Courier Preferences">
        <ComingSoon title="Per-zone rates & courier rules" description="Will let you set different rates by state/region and prefer specific couriers per pincode." requires={["Defined shipping zones", "Multiple Shiprocket pickup locations (optional)"]} />
      </Section>
    </div>
  );
}