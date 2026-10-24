import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, Section, PageHeader, ComingSoon } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/seo")({ head: () => ({ meta: adminPageMeta("Seo Settings") }), component: Page });

type V = {
  title_suffix: string;
  default_description: string;
  default_og_image: string;
  twitter_handle: string;
  noindex_site: boolean;
  schema_organization: string;
};

const DEFAULTS: V = {
  title_suffix: "— Indian Handicraft",
  default_description: "Handwoven, hand-block printed, and hand-embroidered ethnic wear from India.",
  default_og_image: "",
  twitter_handle: "",
  noindex_site: false,
  schema_organization: "",
};

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("seo", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="SEO" description="Search engine and social sharing defaults. Per-page overrides live on each route." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Global Meta">
        <Field label="Title suffix" hint="Appended to every page title. Example: ' — Brand Name'"><input className={input} value={value.title_suffix} onChange={(e) => set("title_suffix", e.target.value)} maxLength={80} /></Field>
        <Field label="Default description" hint="Fallback meta description when a page doesn't define one."><textarea rows={2} className={input} value={value.default_description} onChange={(e) => set("default_description", e.target.value)} maxLength={300} /></Field>
        <Field label="Default Open Graph image URL" hint="Used for social shares when a page doesn't supply one. 1200×630 recommended."><input className={input} value={value.default_og_image} onChange={(e) => set("default_og_image", e.target.value)} /></Field>
        <Field label="Twitter handle" hint="Without the @ — used in twitter:site meta tag."><input className={input} value={value.twitter_handle} onChange={(e) => set("twitter_handle", e.target.value)} maxLength={32} /></Field>
      </Section>

      <Section title="Indexing" description="Control whether search engines can index your site.">
        <label className="flex items-start gap-3 py-2 cursor-pointer">
          <input type="checkbox" checked={value.noindex_site} onChange={(e) => set("noindex_site", e.target.checked)} className="mt-1" />
          <div className="text-sm">
            <div className="font-medium">Block search engines (noindex)</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Adds a sitewide robots noindex tag. Leave OFF when you want Google to find you.</div>
          </div>
        </label>
      </Section>

      <Section title="Structured Data">
        <Field label="Organization JSON-LD" hint="Optional JSON-LD blob injected into the homepage. Leave empty to use the default."><textarea rows={5} className={`${input} font-mono text-xs`} value={value.schema_organization} onChange={(e) => set("schema_organization", e.target.value)} placeholder='{"@context":"https://schema.org","@type":"Organization", ...}' /></Field>
      </Section>

      <Section title="Sitemap & Robots">
        <ComingSoon title="Visual sitemap & robots editor" description="Sitemap is auto-generated at /sitemap.xml from your published routes and products. Robots.txt is served from /robots.txt." />
      </Section>
    </form>
  );
}