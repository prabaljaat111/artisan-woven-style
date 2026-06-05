import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, PageHeader, Section } from "@/components/admin/SettingsField";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/product")({ component: Page });

type V = {
  default_status: "draft" | "active";
  sku_prefix: string;
  sku_pad: number;
  sizes_csv: string;
  colors_csv: string;
  require_image: boolean;
  require_description: boolean;
  default_tax_pct: number;
  default_weight_g: number;
};

const DEFAULTS: V = {
  default_status: "draft",
  sku_prefix: "IH",
  sku_pad: 5,
  sizes_csv: "XS,S,M,L,XL,XXL,Free Size",
  colors_csv: "Red,Pink,Maroon,Gold,Ivory,Black,Green,Blue,Yellow",
  require_image: true,
  require_description: true,
  default_tax_pct: 5,
  default_weight_g: 500,
};

const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("product", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="Product Settings" description="Defaults applied when a new product is created." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />

      <Section title="Defaults">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Default Status" hint="Status assigned when creating a new product."><select className={input} value={value.default_status} onChange={(e) => set("default_status", e.target.value as V["default_status"])}><option value="draft">Draft</option><option value="active">Active</option></select></Field>
          <Field label="Default Tax %" hint="GST percentage prefilled on new products."><input type="number" min={0} max={50} className={input} value={value.default_tax_pct} onChange={(e) => set("default_tax_pct", +e.target.value)} /></Field>
          <Field label="Default Weight (g)" hint="Used by Shiprocket if a product has no weight."><input type="number" min={0} className={input} value={value.default_weight_g} onChange={(e) => set("default_weight_g", +e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="SKU Generator">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="SKU Prefix" hint={`Result: ${value.sku_prefix}${String(1).padStart(value.sku_pad, "0")}`}><input className={input} value={value.sku_prefix} onChange={(e) => set("sku_prefix", e.target.value.toUpperCase())} maxLength={8} /></Field>
          <Field label="Number Padding"><input type="number" min={3} max={10} className={input} value={value.sku_pad} onChange={(e) => set("sku_pad", +e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Master Lists" description="Comma-separated. Shown as options in the product editor.">
        <Field label="Sizes"><textarea rows={2} className={input} value={value.sizes_csv} onChange={(e) => set("sizes_csv", e.target.value)} /></Field>
        <Field label="Colors"><textarea rows={2} className={input} value={value.colors_csv} onChange={(e) => set("colors_csv", e.target.value)} /></Field>
      </Section>

      <Section title="Validation">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.require_image} onChange={(e) => set("require_image", e.target.checked)} /> Require at least one product image</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.require_description} onChange={(e) => set("require_description", e.target.checked)} /> Require a description before publishing</label>
      </Section>
    </form>
  );
}
