import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, Chip, PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/staff")({
  component: StaffPage,
  head: () => ({ meta: adminPageMeta("Staff & Permissions") }),
});

const ROLES = ["admin", "manager", "staff", "customer"] as const;
const PERMS = [
  ["Everything incl. staff & settings", "admin"],
  ["Products, approvals, orders, marketing", "manager"],
  ["Add/edit products (sent for approval), inventory", "staff"],
];

function StaffPage() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["team"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role"),
        supabase.from("profiles").select("id, full_name, phone"),
      ]);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (roles ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) }));
    },
  });

  if (!isAdmin) return <PageHeader title="Staff & Permissions" subtitle="Only admins can manage staff." />;

  async function setRole(id: string, role: string) {
    const { error } = await supabase.from("user_roles").update({ role: role as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["team"] });
  }

  const team = [...data].sort((a, b) => ROLES.indexOf(a.role as any) - ROLES.indexOf(b.role as any));
  return (
    <div>
      <PageHeader title="Staff & Permissions" subtitle="People sign up on the store, then you give them a role here." />
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        {PERMS.map(([d, r]) => <Card key={r} className="p-4"><div className="font-display text-lg capitalize">{r}</div><div className="text-sm text-muted-foreground">{d}</div></Card>)}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3">Person</th><th className="p-3">Current role</th><th className="p-3">Change role</th></tr></thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id} className="border-t border-border/60">
                <td className="p-3"><div className="font-medium">{m.profile?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{m.profile?.phone ?? ""}</div></td>
                <td className="p-3"><Chip tone={m.role === "customer" ? "gray" : m.role === "admin" ? "green" : "blue"}>{m.role}</Chip></td>
                <td className="p-3">
                  <select disabled={m.user_id === user?.id} value={m.role} onChange={(e) => setRole(m.id, e.target.value)} className="h-9 px-2 rounded-lg border border-border bg-card">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
