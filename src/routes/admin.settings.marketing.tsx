import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Section, PageHeader, ComingSoon } from "@/components/admin/SettingsField";
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
        <ComingSoon title="Time-bound sale scheduler" description="Pin discounted prices to a date window with countdown timers across the site." requires={["Sale price scheduling field on products", "Cron job for activation"]} />
      </Section>
      <Section title="Loyalty & Referrals">
        <ComingSoon title="Reward points & referral program" description="Customers earn points on purchases and referrals; redeemable at checkout." requires={["Points ledger table", "Referral attribution tracking", "Redemption rules"]} />
      </Section>
      <Section title="Abandoned Cart Recovery">
        <ComingSoon title="Automatic recovery emails" description="Detect carts inactive for 1h / 24h / 72h and send recovery emails with the saved cart link." requires={["Persistent cart table", "Email queue automation"]} />
      </Section>
    </div>
  );
}