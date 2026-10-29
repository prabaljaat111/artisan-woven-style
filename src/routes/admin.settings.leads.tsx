import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Field, PageHeader, Section } from "@/components/admin/SettingsField";
import { GrowthTools } from "@/components/admin/GrowthTools";
import { CrmExport } from "@/components/admin/CrmExport";
import { useSetting } from "@/hooks/use-setting";

export const Route = createFileRoute("/admin/settings/leads")({ head: () => ({ meta: adminPageMeta("Leads Settings") }), component: Page });

type V = {
  sources_csv: string;
  statuses_csv: string;
  default_status: string;
  auto_whatsapp: boolean;
  auto_email: boolean;
  follow_up_days: number;
  assignment_emails_csv: string;
};

const DEFAULTS: V = {
  sources_csv: "Website,Instagram,Facebook,WhatsApp,Referral,Walk-in",
  statuses_csv: "New,Contacted,Qualified,Quoted,Won,Lost",
  default_status: "New",
  auto_whatsapp: true,
  auto_email: false,
  follow_up_days: 2,
  assignment_emails_csv: "",
};

const input = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";

function Page() {
  const { value, setValue, save, loading, saving } = useSetting<V>("leads", DEFAULTS);
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = <K extends keyof V>(k: K, v: V[K]) => setValue({ ...value, [k]: v });
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-w-3xl space-y-6">
      <PageHeader title="Lead Management" description="Sources, statuses, and follow-up rules." actions={
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>} />
      <Section title="Live Leads">
        <Link to="/admin/leads" className="inline-flex text-sm text-primary underline">Open Leads dashboard →</Link>
      </Section>
      <Section title="Pipeline" description="Comma-separated lists used in the leads form and Kanban.">
        <Field label="Sources"><textarea rows={2} className={input} value={value.sources_csv} onChange={(e) => set("sources_csv", e.target.value)} /></Field>
        <Field label="Statuses"><textarea rows={2} className={input} value={value.statuses_csv} onChange={(e) => set("statuses_csv", e.target.value)} /></Field>
        <Field label="Default Status"><input className={input} value={value.default_status} onChange={(e) => set("default_status", e.target.value)} maxLength={40} /></Field>
      </Section>
      <Section title="Automation">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.auto_whatsapp} onChange={(e) => set("auto_whatsapp", e.target.checked)} /> Auto-send WhatsApp greeting on new lead</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.auto_email} onChange={(e) => set("auto_email", e.target.checked)} /> Auto-send email acknowledgement on new lead</label>
        <Field label="Follow-up reminder (days)" hint="Show overdue badge after this many days without activity."><input type="number" min={0} max={30} className={input} value={value.follow_up_days} onChange={(e) => set("follow_up_days", +e.target.value)} /></Field>
      </Section>
      <Section title="Assignment">
        <Field label="Notify these emails on new leads" hint="Comma-separated list."><textarea rows={2} className={input} value={value.assignment_emails_csv} onChange={(e) => set("assignment_emails_csv", e.target.value)} /></Field>
        <GrowthTools mode="routing" />
        <CrmExport />
      </Section>
    </form>
  );
}
