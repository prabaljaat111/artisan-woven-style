import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/product")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Product" description="Defaults and rules applied to every new product." />
    <Section title="Catalogue Defaults">
      <ComingSoon title="Default status, SKU rules, size & color master lists" description="Define your master size/color lists and the default status (Draft vs Active) for new products." requires={["Master size table", "Master color table", "SKU template generator"]} />
    </Section>
    <Section title="Approval & Visibility">
      <ComingSoon title="Multi-step product approval" description="Optional review queue before products go live, useful when you have multiple catalogue managers." />
    </Section>
  </div>
) });
