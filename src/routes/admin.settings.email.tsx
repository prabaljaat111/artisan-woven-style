import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/email")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Email" description="Transactional and marketing email templates." />
    <Section title="Templates">
      <ComingSoon title="Editable email templates" description="Order confirmation, shipped, delivered, welcome, abandoned cart — with brand-styled HTML and merge variables." requires={["Lovable Email infrastructure (already on)", "Template editor UI", "Per-template test send"]} />
    </Section>
  </div>
) });
