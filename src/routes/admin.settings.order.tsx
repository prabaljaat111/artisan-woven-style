import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/order")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Orders" description="Status workflow, cancellation, returns, and invoice rules." />
    <Section title="Workflow & Policies">
      <ComingSoon title="Configurable order policies" description="Cancellation window, return window, exchange rules, and invoice numbering prefix." requires={["Cancellation/return state machine", "Invoice template editor"]} />
    </Section>
  </div>
) });
