import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/backup")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Backup & System" description="Backups, restore, and system health monitoring." />
    <Section title="Backups">
      <ComingSoon title="Scheduled database & file backups" description="The platform takes infrastructure-level backups automatically. Self-serve restore points and one-click rollback are on the roadmap." requires={["Snapshot storage policy", "Restore safety gate"]} />
    </Section>
    <Section title="System Health">
      <ComingSoon title="Health dashboard & error logs" description="Live status of database, edge functions, payment provider, and shipping provider, plus aggregated error logs." />
    </Section>
  </div>
) });
