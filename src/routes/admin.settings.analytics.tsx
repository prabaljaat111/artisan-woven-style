import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { ANALYTICS_DEFAULTS, analyticsConfig } from "@/lib/analytics-config";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Field, Section, PageHeader } from "@/components/admin/SettingsField";
import { ConversionTools } from "@/components/admin/ConversionTools";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/analytics")({ head: () => ({ meta: adminPageMeta("Analytics Settings") }), component: Page });

type V = { ga4_id: string; gtm_id: string; meta_pixel_id: string; gsc_verification: string };
const DEFAULTS: V = ANALYTICS_DEFAULTS;

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("analytics", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); const valid = analyticsConfig(value); if (Object.keys(value).some((k) => value[k as keyof V].trim() !== valid[k as keyof V])) return toast.error("Check the tracking ID formats before saving"); save(valid); }} className="max-w-3xl space-y-6">
      <PageHeader title="Analytics" description="Connect tracking tools. Loaded site-wide via the root layout." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Google">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="GA4 Measurement ID" hint="Format: G-XXXXXXXXXX"><input className={input} value={value.ga4_id} onChange={(e) => set("ga4_id", e.target.value)} maxLength={20} placeholder="G-XXXXXXXXXX" /></Field>
          <Field label="Google Tag Manager ID" hint="Format: GTM-XXXXXX"><input className={input} value={value.gtm_id} onChange={(e) => set("gtm_id", e.target.value)} maxLength={20} placeholder="GTM-XXXXXX" /></Field>
        </div>
        <Field label="Google Search Console verification" hint="The content value from the HTML tag verification method."><input className={input} value={value.gsc_verification} onChange={(e) => set("gsc_verification", e.target.value)} maxLength={120} /></Field>
      </Section>

      <Section title="Meta (Facebook/Instagram)">
        <Field label="Meta Pixel ID" hint="15-16 digit numeric ID from Meta Events Manager."><input className={input} value={value.meta_pixel_id} onChange={(e) => set("meta_pixel_id", e.target.value)} maxLength={20} /></Field>
      </Section>

      <Section title="Visitor reports"><div className="flex flex-wrap gap-4 text-sm"><a href="https://analytics.google.com/" target="_blank" rel="noreferrer" className="text-primary underline">Open Google Analytics</a><a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-primary underline">Open Search Console</a></div><p className="text-sm text-muted-foreground">Sign in with the Google account that owns your property. Visitor data is held by Google and is not imported into this dashboard.</p></Section>
      <Section title="Conversion API & Event Tracking">
        <ConversionTools />
      </Section>
    </form>
  );
}