import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { Card, PageHeader, inputCls, btnPrimary } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/brands")({
  component: BrandsPage,
  head: () => ({ meta: adminPageMeta("Brands") }),
});

function BrandsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["brands"], queryFn: async () => (await supabase.from("brands").select("*").order("name")).data ?? [] });
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");

  async function add() {
    if (!name.trim()) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("brands").insert({ name: name.trim(), slug, logo_url: logo || null });
    if (error) return toast.error(error.message);
    setName(""); setLogo(""); qc.invalidateQueries({ queryKey: ["brands"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brands"] });
  }

  return (
    <div>
      <PageHeader title="Brands" subtitle="Labels you sell under." />
      <Card className="p-5 mb-4 flex flex-wrap gap-2">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" />
        <input className={`${inputCls} flex-1 min-w-48`} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="Logo URL (optional)" />
        <button className={btnPrimary} onClick={add}>Add brand</button>
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((b: any) => (
          <Card key={b.id} className="p-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-secondary grid place-items-center overflow-hidden font-display text-lg text-admin-nav">{b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain" /> : b.name[0]}</div>
            <div className="flex-1"><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground">{b.slug}</div></div>
            <button className="text-xs text-status-red" onClick={() => remove(b.id)}>Delete</button>
          </Card>
        ))}
      </div>
    </div>
  );
}
