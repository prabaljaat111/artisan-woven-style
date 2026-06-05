import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/website")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Website" description="Homepage banners, sections, footer, and navigation menu." />
    <Section title="Homepage Management">
      <ComingSoon title="Hero banner & section CMS" description="Drag-reorder hero slides, swap promo bars, pick featured collections — all without redeploying." requires={["app_settings.homepage schema", "Image management on the brand bucket", "Drag-and-drop reorder"]} />
    </Section>
    <Section title="Footer & Navigation">
      <ComingSoon title="Footer columns & nav menu editor" description="Edit the footer columns, social links, and main navigation menu from a single place." />
    </Section>
  </div>
) });
