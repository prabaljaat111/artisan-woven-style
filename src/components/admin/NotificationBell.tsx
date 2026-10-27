import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationBell({ userId, lowStockCount }: { userId: string; lowStockCount: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const key = ["notifications", userId];
  const { data = [] } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("notifications").select("id, title, body, link, kind, read_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  useEffect(() => {
    const ch = supabase.channel(`notif-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]); // eslint-disable-line
  const unread = data.filter((n) => !n.read_at).length;
  const total = unread + (lowStockCount > 0 ? 1 : 0);

  async function markAll() {
    const ids = data.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length) { await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids); qc.invalidateQueries({ queryKey: key }); }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-card">
          <Bell className="h-5 w-5" />
          {total > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-status-red text-card text-[10px] grid place-items-center">{unread + lowStockCount}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 admin-ui">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border"><span className="font-semibold text-sm">Notifications</span>{unread > 0 && <button className="text-xs underline" onClick={markAll}>Mark all read</button>}</div>
        <div className="max-h-96 overflow-y-auto">
          {lowStockCount > 0 && <Link to="/admin/inventory" onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 border-b border-border hover:bg-secondary/40"><AlertTriangle className="h-4 w-4 text-status-orange mt-0.5" /><div className="text-sm">{lowStockCount} stock alert{lowStockCount === 1 ? "" : "s"}<div className="text-xs text-muted-foreground">Open Inventory</div></div></Link>}
          {data.length === 0 && lowStockCount === 0 && <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
          {data.map((n) => (
            <button key={n.id} onClick={async () => { if (!n.read_at) { await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id); qc.invalidateQueries({ queryKey: key }); } setOpen(false); if (n.link?.startsWith("/admin")) navigate({ to: n.link as any }); }}
              className={`w-full text-left flex gap-3 px-4 py-3 border-b border-border hover:bg-secondary/40 ${n.read_at ? "" : "bg-admin-pill/20"}`}>
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.kind === "success" ? "bg-status-green" : n.kind === "error" ? "bg-status-red" : "bg-status-blue"}`} />
              <div className="min-w-0"><div className="text-sm font-medium">{n.title}</div>{n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}<div className="text-[11px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div></div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
