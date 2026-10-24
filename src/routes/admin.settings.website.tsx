import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Field, PageHeader, Section } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/website")({ component: Page });

type Slide = { image: string; headline: string; subhead: string; cta_label: string; cta_url: string };
type NavItem = { label: string; url: string };
type FooterCol = { title: string; links: NavItem[] };
type V = {
  promo_bar_enabled: boolean;
  promo_bar_text: string;
  hero_slides: Slide[];
  nav_items: NavItem[];
  footer_columns: FooterCol[];
  footer_about: string;
};

const DEFAULTS: V = {
  promo_bar_enabled: true,
  promo_bar_text: "Free shipping on orders above ₹1499 · COD available",
  hero_slides: [],
  nav_items: [
    { label: "Shop", url: "/shop" },
    { label: "What's New", url: "/whats-new" },
    { label: "Sale", url: "/sale" },
  ],
  footer_columns: [
    { title: "Shop", links: [{ label: "All Products", url: "/shop" }] },
    { title: "Help", links: [{ label: "Contact", url: "/contact" }] },
  ],
  footer_about: "Handcrafted ethnic wear, made in India.",
};

const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("website", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir; if (j < 0 || j >= arr.length) return arr;
    const c = [...arr]; [c[i], c[j]] = [c[j], c[i]]; return c;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-4xl space-y-6">
      <PageHeader title="Website" description="Homepage banners, navigation, and footer content." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Promo Bar" description="Thin announcement bar shown above the header.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.promo_bar_enabled} onChange={(e) => set("promo_bar_enabled", e.target.checked)} />
          Show promo bar
        </label>
        <Field label="Promo Text"><input className={input} value={value.promo_bar_text} onChange={(e) => set("promo_bar_text", e.target.value)} maxLength={160} /></Field>
      </Section>

      <Section title="Hero Slides" description="Rotating banners on the homepage. Reorder with the arrows.">
        {value.hero_slides.map((s, i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-background/50">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground">Slide {i + 1}</div>
              <div className="flex gap-1">
                <button type="button" onClick={() => set("hero_slides", move(value.hero_slides, i, -1))} className="p-1 hover:bg-muted rounded"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => set("hero_slides", move(value.hero_slides, i, 1))} className="p-1 hover:bg-muted rounded"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => set("hero_slides", value.hero_slides.filter((_, j) => j !== i))} className="p-1 hover:bg-muted rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Image URL"><input className={input} value={s.image} onChange={(e) => set("hero_slides", value.hero_slides.map((x, j) => j === i ? { ...x, image: e.target.value } : x))} /></Field>
              <Field label="Headline"><input className={input} value={s.headline} onChange={(e) => set("hero_slides", value.hero_slides.map((x, j) => j === i ? { ...x, headline: e.target.value } : x))} maxLength={80} /></Field>
              <Field label="Subheadline"><input className={input} value={s.subhead} onChange={(e) => set("hero_slides", value.hero_slides.map((x, j) => j === i ? { ...x, subhead: e.target.value } : x))} maxLength={140} /></Field>
              <Field label="CTA Label"><input className={input} value={s.cta_label} onChange={(e) => set("hero_slides", value.hero_slides.map((x, j) => j === i ? { ...x, cta_label: e.target.value } : x))} maxLength={30} /></Field>
              <Field label="CTA URL"><input className={input} value={s.cta_url} onChange={(e) => set("hero_slides", value.hero_slides.map((x, j) => j === i ? { ...x, cta_url: e.target.value } : x))} /></Field>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set("hero_slides", [...value.hero_slides, { image: "", headline: "", subhead: "", cta_label: "Shop Now", cta_url: "/shop" }])} className="text-sm flex items-center gap-1 text-primary hover:underline">
          <Plus className="h-4 w-4" /> Add slide
        </button>
      </Section>

      <Section title="Main Navigation" description="Menu items shown in the header.">
        {value.nav_items.map((n, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <Field label="Label"><input className={input} value={n.label} onChange={(e) => set("nav_items", value.nav_items.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} maxLength={30} /></Field>
            <Field label="URL"><input className={input} value={n.url} onChange={(e) => set("nav_items", value.nav_items.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} /></Field>
            <button type="button" onClick={() => set("nav_items", value.nav_items.filter((_, j) => j !== i))} className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => set("nav_items", [...value.nav_items, { label: "", url: "" }])} className="text-sm flex items-center gap-1 text-primary hover:underline">
          <Plus className="h-4 w-4" /> Add menu item
        </button>
      </Section>

      <Section title="Footer" description="Tagline and link columns shown at the bottom of every page.">
        <Field label="About Text"><textarea rows={2} className={input} value={value.footer_about} onChange={(e) => set("footer_about", e.target.value)} maxLength={240} /></Field>
        {value.footer_columns.map((c, i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-background/50">
            <div className="flex items-center justify-between">
              <input className={input + " font-semibold max-w-xs"} placeholder="Column title" value={c.title} onChange={(e) => set("footer_columns", value.footer_columns.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <button type="button" onClick={() => set("footer_columns", value.footer_columns.filter((_, j) => j !== i))} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            {c.links.map((l, li) => (
              <div key={li} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input className={input} placeholder="Label" value={l.label} onChange={(e) => set("footer_columns", value.footer_columns.map((x, j) => j === i ? { ...x, links: x.links.map((y, k) => k === li ? { ...y, label: e.target.value } : y) } : x))} maxLength={40} />
                <input className={input} placeholder="URL" value={l.url} onChange={(e) => set("footer_columns", value.footer_columns.map((x, j) => j === i ? { ...x, links: x.links.map((y, k) => k === li ? { ...y, url: e.target.value } : y) } : x))} />
                <button type="button" onClick={() => set("footer_columns", value.footer_columns.map((x, j) => j === i ? { ...x, links: x.links.filter((_, k) => k !== li) } : x))} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => set("footer_columns", value.footer_columns.map((x, j) => j === i ? { ...x, links: [...x.links, { label: "", url: "" }] } : x))} className="text-xs text-primary hover:underline">+ Add link</button>
          </div>
        ))}
        <button type="button" onClick={() => set("footer_columns", [...value.footer_columns, { title: "", links: [] }])} className="text-sm flex items-center gap-1 text-primary hover:underline">
          <Plus className="h-4 w-4" /> Add column
        </button>
      </Section>
    </form>
  );
}
