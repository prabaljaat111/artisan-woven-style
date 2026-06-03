import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { adminGetShiprocketSettings, adminUpdateShiprocketSettings } from "@/lib/shiprocket.functions";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

interface SrSettings {
  pickup_location: string;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  weight_kg: number;
  pickup_pincode?: string;
}

function SettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [form, setForm] = useState<SrSettings>({
    pickup_location: "Primary",
    length_cm: 25, breadth_cm: 20, height_cm: 5, weight_kg: 0.5,
    pickup_pincode: "226003",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    adminGetShiprocketSettings()
      .then((s) => setForm({ ...form, ...(s as SrSettings) }))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateShiprocketSettings({ data: form });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-primary flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> Shipping Settings</h1>
        <p className="text-xs text-muted-foreground">Shiprocket account is connected via secrets. Configure defaults below.</p>
      </div>

      <form onSubmit={save} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pickup</div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Pickup Location Nickname" hint="Exact nickname from Shiprocket → Settings → Pickup Addresses">
            <input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
              required maxLength={80}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
          </Field>
          <Field label="Pickup PIN" hint="Used for serviceability/rate checks at checkout">
            <input value={form.pickup_pincode ?? ""} onChange={(e) => setForm({ ...form, pickup_pincode: e.target.value })}
              pattern="\d{6}" maxLength={6}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
          </Field>
        </div>

        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold pt-3 border-t border-border">Default Parcel Dimensions</div>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Length (cm)"><NumberInput value={form.length_cm} onChange={(v) => setForm({ ...form, length_cm: v })} /></Field>
          <Field label="Breadth (cm)"><NumberInput value={form.breadth_cm} onChange={(v) => setForm({ ...form, breadth_cm: v })} /></Field>
          <Field label="Height (cm)"><NumberInput value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} /></Field>
          <Field label="Weight (kg)"><NumberInput step="0.05" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} /></Field>
        </div>

        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>

      <div className="bg-cream border border-border rounded-xl p-5 text-sm space-y-1.5">
        <div className="font-semibold text-primary">How it works</div>
        <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
          <li>Paid orders (Razorpay verified) are auto-pushed to Shiprocket as Prepaid.</li>
          <li>COD orders are pushed to Shiprocket the moment they are placed.</li>
          <li>Checkout shows live serviceability + cheapest courier rate as soon as PIN is entered.</li>
          <li>From the Shipments page, you can assign AWB, schedule pickup, generate label / manifest / invoice, track, or cancel.</li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

function NumberInput({ value, onChange, step = "1" }: { value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <input type="number" step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
  );
}