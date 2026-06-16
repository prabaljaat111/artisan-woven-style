import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Phone, MessageCircle, RefreshCw, Mail } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/contact";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  interest: string | null;
  category: string | null;
  occasion: string | null;
  budget: string | null;
  for_self: boolean | null;
  status: string;
  source: string;
  page_url: string | null;
  notes: string | null;
  conversation: { role: string; content: string }[];
}

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function LeadsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setLeads(data as unknown as Lead[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      if (active?.id === id) setActive({ ...active, status });
    }
  }

  const filtered = leads.filter(
    (l) =>
      (statusFilter === "all" || l.status === statusFilter) &&
      (sourceFilter === "all" || l.source === sourceFilter),
  );
  const sources = Array.from(new Set(leads.map((l) => l.source).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Leads</h1>
          <p className="text-xs text-muted-foreground">
            Captured from contact, inquiry, support, subscribe, exit-intent and chat across the site.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {["all", "new", "qualified", "callback_requested", "stylist_requested", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] px-3 py-1.5 rounded-full ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
          <button
            onClick={load}
            className="text-[11px] px-3 py-1.5 rounded-full bg-secondary flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Source</span>
          {["all", ...sources].map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                sourceFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary/40"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading leads…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">
          No leads in this view yet.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">When</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Source</th>
                    <th className="text-left px-3 py-2">WhatsApp</th>
                    <th className="text-left px-3 py-2">Interest</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setActive(l)}
                      className={`cursor-pointer border-t border-border hover:bg-secondary/30 ${
                        active?.id === l.id ? "bg-secondary/50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(l.created_at), "dd MMM, HH:mm")}
                      </td>
                      <td className="px-3 py-2 font-medium">{l.name}</td>
                      <td className="px-3 py-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-secondary capitalize">
                          {(l.source || "—").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{l.whatsapp || l.phone}</td>
                      <td className="px-3 py-2 text-xs">
                        {l.interest || "—"}
                        {l.occasion ? <span className="text-muted-foreground"> · {l.occasion}</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-primary">
                          {l.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail */}
          <div className="bg-card border border-border rounded-lg p-4">
            {!active ? (
              <div className="text-sm text-muted-foreground text-center py-10">
                Select a lead to view full conversation.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-display text-xl text-primary">{active.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(active.created_at), "dd MMM yyyy · HH:mm")}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="WhatsApp" value={active.whatsapp || active.phone} />
                  <Info label="Phone" value={active.phone} />
                  <Info label="Source" value={active.source} />
                  <Info label="Interest" value={active.interest} />
                  <Info label="Occasion" value={active.occasion} />
                  <Info label="Budget" value={active.budget} />
                  <Info label="For" value={active.for_self === null ? "—" : active.for_self ? "Self" : "Gift"} />
                </div>
                {active.notes && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Submitted details</div>
                    <div className="text-xs whitespace-pre-wrap bg-secondary/40 border border-border rounded-md p-3">
                      {active.notes}
                    </div>
                  </div>
                )}
                {active.page_url && (
                  <div className="text-[11px] text-muted-foreground truncate">From: {active.page_url}</div>
                )}

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/${(active.whatsapp || active.phone).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-[#25D366] text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                  <a
                    href={`tel:${active.phone}`}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-full flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                  <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-xs border border-border px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Brand WhatsApp
                  </a>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["new", "qualified", "callback_requested", "stylist_requested", "closed"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(active.id, s)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border ${
                          active.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border"
                        }`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">Conversation</div>
                  <div className="max-h-80 overflow-y-auto space-y-2 bg-secondary/40 rounded-md p-3 border border-border">
                    {(active.conversation || []).map((m, i) => (
                      <div
                        key={i}
                        className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[90%] whitespace-pre-wrap ${
                          m.role === "assistant"
                            ? "bg-background border border-border"
                            : "bg-primary text-primary-foreground ml-auto"
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}