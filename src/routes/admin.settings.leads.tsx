import { createFileRoute, Link } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/leads")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Lead Management" description="Lead sources, assignment rules, and CRM integration." />
    <Section title="Live Leads">
      <Link to="/admin/leads" className="inline-flex text-sm text-primary underline">Open Leads dashboard →</Link>
    </Section>
    <Section title="Automation">
      <ComingSoon title="Auto-assignment & CRM sync" description="Route leads by category/source to teammates and mirror them into HubSpot / Zoho / Pipedrive." requires={["Teammate accounts", "CRM connector"]} />
    </Section>
  </div>
) });
