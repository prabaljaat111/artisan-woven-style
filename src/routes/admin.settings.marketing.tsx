import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Section, PageHeader } from "@/components/admin/SettingsField";
import { GrowthTools } from "@/components/admin/GrowthTools";
import { SaleScheduler } from "@/components/admin/SaleScheduler";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/admin/settings/marketing")({ head: () => ({ meta: adminPageMeta("Marketing Settings") }), component: Page });

function Page() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Marketing" description="Coupons, campaigns, and growth automation." />
      <Section title="Coupons & Discounts" description="Percentage, flat, and minimum-order coupons.">
        <Link to="/admin/coupons" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm">
          <Ticket className="h-4 w-4" /> Manage coupons
        </Link>
      </Section>
      <Section title="Flash Sales & Festival Offers">
        <SaleScheduler />
      </Section>
      <Section title="Loyalty & Referrals">
        <GrowthTools mode="loyalty" />
      </Section>
      <Section title="Abandoned Cart Recovery">
        <GrowthTools mode="recovery" />
      </Section>
    </div>
  );
}