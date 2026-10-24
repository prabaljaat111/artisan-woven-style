import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, Section, PageHeader } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/general")({ head: () => ({ meta: adminPageMeta("General Settings") }), component: Page });

type V = {
  store_name: string;
  tagline: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  logo_url: string;
  favicon_url: string;
  brand_primary: string;
  social_instagram: string;
  social_facebook: string;
  social_youtube: string;
  social_pinterest: string;
};

const DEFAULTS: V = {
  store_name: "Indian Handicraft",
  tagline: "", description: "",
  contact_email: "", contact_phone: "",
  address_line1: "", address_line2: "", city: "", state: "", pincode: "",
  gstin: "",
  logo_url: "", favicon_url: "", brand_primary: "",
  social_instagram: "", social_facebook: "", social_youtube: "", social_pinterest: "",
};

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("general", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-4xl space-y-6">
      <PageHeader title="General" description="Core information about your store — used across the site, invoices, emails, and SEO." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Brand" description="Shown in the header, page titles, and social previews.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Store Name" hint="Appears in the browser tab and shareable link previews."><input className={input} value={value.store_name} onChange={(e) => set("store_name", e.target.value)} maxLength={80} /></Field>
          <Field label="Tagline" hint="One short line shown under the logo on the homepage."><input className={input} value={value.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} /></Field>
        </div>
        <Field label="Store Description" hint="Used as the default meta description for SEO when a page doesn't set its own."><textarea rows={3} className={input} value={value.description} onChange={(e) => set("description", e.target.value)} maxLength={300} /></Field>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Logo URL" hint="Public URL of your logo (PNG/SVG). Upload from Files to get a URL."><input className={input} value={value.logo_url} onChange={(e) => set("logo_url", e.target.value)} /></Field>
          <Field label="Favicon URL" hint="32×32 PNG or .ico shown in the browser tab."><input className={input} value={value.favicon_url} onChange={(e) => set("favicon_url", e.target.value)} /></Field>
          <Field label="Brand Primary Color" hint="Optional brand accent override (hex, e.g. #8B1538)."><input className={input} value={value.brand_primary} onChange={(e) => set("brand_primary", e.target.value)} maxLength={9} /></Field>
        </div>
      </Section>

      <Section title="Contact" description="Used in the footer, invoices, and order emails.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Email"><input type="email" className={input} value={value.contact_email} onChange={(e) => set("contact_email", e.target.value)} maxLength={120} /></Field>
          <Field label="Phone"><input className={input} value={value.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} maxLength={20} /></Field>
        </div>
      </Section>

      <Section title="Business Address" description="Required on invoices for Indian GST compliance.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Address Line 1"><input className={input} value={value.address_line1} onChange={(e) => set("address_line1", e.target.value)} maxLength={120} /></Field>
          <Field label="Address Line 2"><input className={input} value={value.address_line2} onChange={(e) => set("address_line2", e.target.value)} maxLength={120} /></Field>
          <Field label="City"><input className={input} value={value.city} onChange={(e) => set("city", e.target.value)} maxLength={60} /></Field>
          <Field label="State"><input className={input} value={value.state} onChange={(e) => set("state", e.target.value)} maxLength={60} /></Field>
          <Field label="Pincode"><input className={input} value={value.pincode} onChange={(e) => set("pincode", e.target.value)} maxLength={10} /></Field>
          <Field label="GSTIN" hint="15-digit GST Identification Number, if registered."><input className={input} value={value.gstin} onChange={(e) => set("gstin", e.target.value)} maxLength={15} /></Field>
        </div>
      </Section>

      <Section title="Social Links" description="Linked from the footer and used in social preview tags.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Instagram URL"><input className={input} value={value.social_instagram} onChange={(e) => set("social_instagram", e.target.value)} /></Field>
          <Field label="Facebook URL"><input className={input} value={value.social_facebook} onChange={(e) => set("social_facebook", e.target.value)} /></Field>
          <Field label="YouTube URL"><input className={input} value={value.social_youtube} onChange={(e) => set("social_youtube", e.target.value)} /></Field>
          <Field label="Pinterest URL"><input className={input} value={value.social_pinterest} onChange={(e) => set("social_pinterest", e.target.value)} /></Field>
        </div>
      </Section>
    </form>
  );
}