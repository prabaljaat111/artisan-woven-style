import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { Card, PageHeader, inputCls, btnPrimary } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/attributes")({
  component: AttributesPage,
  head: () => ({ meta: adminPageMeta("Attributes") }),
});

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function AttributesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => (await supabase.from("attributes").select("id, name, slug, attribute_values(id, name, color_hex, sort_order)").order("name")).data ?? [],
  });
  const [newAttr, setNewAttr] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["attributes"] });

  async function addAttr() {
    if (!newAttr.trim()) return;
    const { error } = await supabase.from("attributes").insert({ name: newAttr.trim(), slug: slugify(newAttr) });
    if (error) return toast.error(error.message);
    setNewAttr(""); refresh();
  }

  return (
    <div>
      <PageHeader title="Attributes" subtitle="Sizes, colors, fabrics and work types used across products." actions={
        <div className="flex gap-2"><input className={inputCls} value={newAttr} onChange={(e) => setNewAttr(e.target.value)} placeholder="New attribute" /><button className={btnPrimary} onClick={addAttr}>Add</button></div>
      } />
      <div className="grid md:grid-cols-2 gap-4">
        {data.map((a: any) => <AttrCard key={a.id} attr={a} onChange={refresh} />)}
      </div>
    </div>
  );
}

function AttrCard({ attr, onChange }: { attr: any; onChange: () => void }) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#cccccc");
  const isColor = attr.slug === "color";
  const values = [...(attr.attribute_values ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("attribute_values").insert({ attribute_id: attr.id, name: name.trim(), slug: slugify(name), sort_order: values.length + 1, color_hex: isColor ? hex : null });
    if (error) return toast.error(error.message);
    setName(""); onChange();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("attribute_values").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <Card className="p-5">
      <h3 className="font-display text-xl mb-3">{attr.name}</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {values.map((v: any) => (
          <span key={v.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-secondary text-sm">
            {v.color_hex && <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: v.color_hex }} />}
            {v.name}
            <button aria-label={`Remove ${v.name}`} onClick={() => remove(v.id)} className="h-5 w-5 grid place-items-center rounded-full hover:bg-card"><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
        {values.length === 0 && <span className="text-sm text-muted-foreground">No values yet.</span>}
      </div>
      <div className="flex gap-2">
        {isColor && <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-10 w-12 rounded-lg border border-border" />}
        <input className={`${inputCls} flex-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Add ${attr.name.toLowerCase()}`} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className={btnPrimary} onClick={add}>Add</button>
      </div>
    </Card>
  );
}
