import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/settings/reports")({ head: () => ({ meta: adminPageMeta("Reports Settings") }), component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Reports & BI" description="Sales, product, customer, inventory, and marketing performance." />
    <Section title="Live Dashboard">
      <Link to="/admin" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm">
        <BarChart3 className="h-4 w-4" /> Open dashboard
      </Link>
    </Section>
    <Section title="Deep Reports">
      <ComingSoon title="Exportable BI reports" description="Cohort retention, repeat purchase rate, channel attribution, marketing ROAS, inventory turnover." requires={["Reporting warehouse view", "CSV export pipeline"]} />
    </Section>
  </div>
) });
