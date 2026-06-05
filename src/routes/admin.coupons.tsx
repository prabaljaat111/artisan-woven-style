import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListCoupons, adminUpsertCoupon, adminDeleteCoupon } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
  head: () => ({ meta: [{ title: "Coupons · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function CouponsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() { setLoading(true); try { setRows(await adminListCoupons()); } finally { setLoading(false); } }
  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  async function remove(id: string) {
    if (!confirm("Delete coupon?")) return;
    try { await adminDeleteCoupon({ data: { id } }); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Coupons</h1>
          <p className="text-xs text-muted-foreground">{rows.length} total</p>
        </div>
        <button onClick={() => setEditing({})} className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Code</th><th className="text-left p-2">Discount</th><th className="text-right p-2">Min Order</th><th className="text-left p-2">Expires</th><th className="text-left p-2">Active</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-2 font-mono font-semibold">{c.code}</td>
                  <td className="p-2">{c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                  <td className="p-2 text-right">₹{Number(c.min_order).toLocaleString("en-IN")}</td>
                  <td className="p-2 text-xs">{c.expires_at ? format(new Date(c.expires_at), "dd MMM yy") : "—"}</td>
                  <td className="p-2"><span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-500/20 text-green-700" : "bg-secondary"}`}>{c.is_active ? "Active" : "Off"}</span></td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="p-1.5 hover:bg-secondary rounded"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-secondary rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">No coupons.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && <CouponModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CouponModal({ initial, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    id: initial.id ?? null,
    code: initial.code ?? "",
    description: initial.description ?? "",
    discount_type: initial.discount_type ?? "percent",
    discount_value: Number(initial.discount_value ?? 10),
    min_order: Number(initial.min_order ?? 0),
    is_active: initial.is_active ?? true,
    expires_at: initial.expires_at ? new Date(initial.expires_at).toISOString().slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (form.code.trim().length < 2) return toast.error("Code must be at least 2 chars");
    if (!/^[A-Z0-9_-]+$/.test(form.code)) return toast.error("Code: uppercase letters, digits, _-");
    if (form.discount_value <= 0) return toast.error("Discount value must be > 0");
    if (form.discount_type === "percent" && form.discount_value > 100) return toast.error("Percent must be ≤ 100");
    setSaving(true);
    try {
      const payload = { ...form, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null };
      await adminUpsertCoupon({ data: payload }); toast.success("Saved"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }
  const cls = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center"><div className="font-display text-xl text-primary">{form.id ? "Edit" : "Add"} Coupon</div><button onClick={onClose}><X className="h-4 w-4" /></button></div>
        <input placeholder="CODE (UPPER)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={cls + " font-mono"} />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cls} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={cls}>
            <option value="percent">% Percent</option>
            <option value="flat">₹ Flat</option>
          </select>
          <input type="number" placeholder="Value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className={cls} />
        </div>
        <input type="number" placeholder="Min order ₹" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} className={cls} />
        <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={cls} />
        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        <button disabled={saving} onClick={save} className="w-full bg-primary text-primary-foreground rounded-full py-2.5 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}