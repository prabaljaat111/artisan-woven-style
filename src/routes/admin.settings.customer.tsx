import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader, Section } from "@/components/admin/SettingsField";

export const Route = createFileRoute("/admin/settings/customer")({ component: () => (
  <div className="max-w-3xl space-y-6">
    <PageHeader title="Customers" description="Signup, login, wishlist, rewards, and customer groups." />
    <Section title="Auth & Account">
      <ComingSoon title="OTP login, social providers, wishlist toggles" description="Per-feature toggles for the customer experience." requires={["OTP via SMS provider", "Wishlist already enabled"]} />
    </Section>
    <Section title="Loyalty & Groups">
      <ComingSoon title="Customer groups, rewards, referrals" description="Segment customers (wholesale, VIP, …) and run a points + referral program." requires={["Customer groups table", "Points ledger"]} />
    </Section>
  </div>
) });
