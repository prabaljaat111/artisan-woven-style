import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Section, PageHeader, ComingSoon } from "@/components/admin/SettingsField";
import { listAdmins, setUserRole } from "@/lib/settings.functions";
import { Shield, UserMinus, UserPlus } from "lucide-react";

export const Route = createFileRoute("/admin/settings/security")({ head: () => ({ meta: adminPageMeta("Security Settings") }), component: Page });

type Row = { user_id: string; role: string; created_at: string; name: string | null; phone: string | null };

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newUid, setNewUid] = useState("");

  function refresh() {
    setLoading(true);
    listAdmins().then((r) => setRows(r.rows)).catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load")).finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function toggleAdmin(uid: string, isAdmin: boolean) {
    setBusy(uid);
    try {
      await setUserRole({ data: { user_id: uid, role: "admin", action: isAdmin ? "remove" : "add" } });
      toast.success(isAdmin ? "Admin removed" : "Admin granted");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  }

  async function grant(uid: string) {
    if (!/^[0-9a-f-]{36}$/i.test(uid)) return toast.error("Enter a valid user ID (UUID)");
    setBusy(uid);
    try {
      await setUserRole({ data: { user_id: uid, role: "admin", action: "add" } });
      toast.success("Admin granted"); setNewUid(""); refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  }

  const admins = rows.filter((r) => r.role === "admin");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Security" description="Who can sign into the admin area, and how." />

      <Section title="Admin Users" description="Anyone listed here can access /admin and edit your store.">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="space-y-2">
            {admins.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />{r.name ?? "(no name)"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.user_id}</div>
                </div>
                <button onClick={() => toggleAdmin(r.user_id, true)} disabled={busy === r.user_id || admins.length <= 1} className="text-xs flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted disabled:opacity-40">
                  <UserMinus className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ))}
            {admins.length === 0 && <div className="text-xs text-muted-foreground">No admins yet.</div>}
          </div>
        )}
        <div className="border-t border-border pt-4 mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Grant admin by User ID</div>
          <div className="flex gap-2">
            <input className="flex-1 border border-border rounded-md px-3 py-2 bg-background text-sm" value={newUid} onChange={(e) => setNewUid(e.target.value)} placeholder="UUID from /admin/customers" />
            <button onClick={() => grant(newUid)} disabled={!newUid || busy === newUid} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> Grant
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Copy a user's ID from the Customers page.</div>
        </div>
      </Section>

      <Section title="Two-Factor Authentication">
        <ComingSoon title="2FA for admin accounts" description="Require a TOTP code in addition to password for every admin login." requires={["TOTP enrollment flow", "Recovery codes"]} />
      </Section>

      <Section title="Activity Logs & API Access">
        <ComingSoon title="Audit log & API tokens" description="Track every admin action and issue scoped API tokens for integrations." requires={["audit_log table with append-only RLS", "API token store"]} />
      </Section>
    </div>
  );
}