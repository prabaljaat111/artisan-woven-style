import { useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { growthOverview,growthAction,type GrowthActionInput } from '@/lib/growth.functions';
import { pointBalance } from '@/lib/growth-rules';
import { Button } from '@/components/ui/button';
import { Plus,Trash2,RefreshCw,KeyRound,Download } from 'lucide-react';
import { toast } from 'sonner';
import { RewardRules } from './RewardRules';

type Mode='loyalty'|'routing'|'zones'|'audit'|'recovery';
const input='w-full border border-border rounded-md px-3 py-2 bg-background text-sm';
export function GrowthTools({mode}:{mode:Mode}) {
  const queryClient=useQueryClient();
  const query=useQuery({queryKey:['growth-tools'],queryFn:()=>growthOverview()});
  const act=useServerFn(growthAction);
  const [busy,setBusy]=useState(false);
  const [name,setName]=useState(''); const [description,setDescription]=useState('');
  const [user,setUser]=useState(''); const [reason,setReason]=useState(''); const [points,setPoints]=useState(0);
  const [source,setSource]=useState(''); const [category,setCategory]=useState(''); const [priority,setPriority]=useState(0);
  const [states,setStates]=useState(''); const [pins,setPins]=useState(''); const [rate,setRate]=useState(0); const [free,setFree]=useState(''); const [courier,setCourier]=useState('');
  const [scope,setScope]=useState<'catalog:read'|'inventory:read'>('catalog:read'); const [token,setToken]=useState<string|null>(null); const [search,setSearch]=useState('');
  const run=async(data:GrowthActionInput)=>{
    setBusy(true); try {const r=await act({data}); if(r.token) setToken(r.token); toast.success('Saved'); await queryClient.invalidateQueries({queryKey:['growth-tools']});} catch(e){toast.error(e instanceof Error?e.message:'Could not save');} finally{setBusy(false);}
  };
  if(query.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if(query.error || !query.data) return <div role="alert" className="text-sm text-destructive">{query.error?.message??'Could not load'} <Button type="button" variant="outline" onClick={()=>query.refetch()}>Retry</Button></div>;
  const d=query.data;
  const customerSelect=<select aria-label="Customer or teammate" className={input} value={user} onChange={e=>setUser(e.target.value)}><option value="">Select customer or teammate</option>{d.customers.map(c=><option key={c.id} value={c.id}>{c.full_name||c.id}</option>)}</select>;
  const remove=(entity:'customer_groups'|'lead_routing_rules'|'shipping_zones',id:string)=>{if(window.confirm('Delete this record?')) run({type:'delete',entity,id});};
  return <div className="space-y-4">
    <div className="flex justify-end"><Button type="button" size="sm" variant="ghost" onClick={()=>query.refetch()}><RefreshCw className="h-4 w-4"/>Refresh</Button></div>
    {mode==='loyalty' && <>
      <RewardRules />
      <div className="grid sm:grid-cols-2 gap-3"><input aria-label="Group name" className={input} placeholder="Group name" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Group description" className={input} placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)}/></div>
      <Button type="button" disabled={busy||!name.trim()} onClick={()=>run({type:'group',name,description})}><Plus className="h-4 w-4"/>Add customer group</Button>
      <div className="flex flex-wrap gap-3">{d.groups.map(g=><div key={g.id} className="flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm">{g.name}<Button type="button" size="icon" variant="ghost" aria-label={`Delete ${g.name}`} onClick={()=>remove('customer_groups',g.id)}><Trash2 className="h-4 w-4"/></Button></div>)}</div>
      <div className="border-t border-border pt-4 space-y-3"><h3 className="font-display text-lg">Points ledger</h3>{customerSelect}<div className="grid sm:grid-cols-2 gap-3"><input aria-label="Points to credit" type="number" min={1} className={input} value={points} onChange={e=>setPoints(Number(e.target.value))}/><input aria-label="Credit reason" className={input} placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)}/></div><Button type="button" disabled={busy||!user||points<=0||!reason.trim()} onClick={()=>run({type:'points',user_id:user,points,reason})}>Credit points</Button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-border"><th className="py-3">Customer</th><th>Group</th><th>Points</th><th>Referral code</th></tr></thead><tbody>{d.customers.map(c=><tr key={c.id} className="border-b border-border"><td className="py-3 pr-3">{c.full_name||'Unnamed customer'}</td><td><select aria-label={`Group for ${c.full_name||c.id}`} className={input} value={c.customer_group_id??''} disabled={busy} onChange={e=>run({type:'membership',user_id:c.id,group_id:e.target.value||null})}><option value="">No group</option>{d.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></td><td className="px-3 tabular-nums">{pointBalance(d.points.filter(p=>p.user_id===c.id)).toLocaleString('en-IN')}</td><td className="font-mono text-xs">{c.referral_code??'—'}</td></tr>)}</tbody></table></div>
      <h3 className="font-display text-lg">Recent credits</h3>{d.points.slice(0,20).map(p=><div key={p.id} className="flex gap-3 border-b border-border py-2 text-sm"><span>{d.customers.find(c=>c.id===p.user_id)?.full_name??'Customer'}</span><span className="ml-auto">+{p.points} · {p.reason}</span><time className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString('en-IN')}</time></div>)}
    </>}
    {mode==='routing' && <>
      <div className="grid sm:grid-cols-2 gap-3"><input aria-label="Lead source" className={input} placeholder="Source (blank = all)" value={source} onChange={e=>setSource(e.target.value)}/><input aria-label="Lead category" className={input} placeholder="Category (blank = all)" value={category} onChange={e=>setCategory(e.target.value)}/>{customerSelect}<input aria-label="Routing priority" type="number" className={input} value={priority} onChange={e=>setPriority(Number(e.target.value))}/></div>
      <Button type="button" disabled={busy||!user} onClick={()=>run({type:'routing',source,category,assigned_to:user,priority})}><Plus className="h-4 w-4"/>Add routing rule</Button>
      {d.routing.map(r=><div key={r.id} className="flex items-center gap-3 border-b border-border py-3 text-sm"><span>{r.source||'All sources'} / {r.category||'All categories'} → {d.customers.find(c=>c.id===r.assigned_to)?.full_name??r.assigned_to}</span><span className="ml-auto">Priority {r.priority}</span><Button type="button" variant="ghost" size="icon" aria-label="Delete routing rule" onClick={()=>remove('lead_routing_rules',r.id)}><Trash2 className="h-4 w-4"/></Button></div>)}
    </>}
    {mode==='zones' && <>
      <div className="grid sm:grid-cols-2 gap-3"><input aria-label="Zone name" className={input} placeholder="Zone name" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Zone states" className={input} placeholder="States, separated by commas" value={states} onChange={e=>setStates(e.target.value)}/><input aria-label="Postal prefixes" className={input} placeholder="Postal prefixes, e.g. 226,227" value={pins} onChange={e=>setPins(e.target.value)}/><label className="text-sm">Rate (₹)<input aria-label="Zone shipping rate" type="number" min={0} className={input} value={rate} onChange={e=>setRate(Number(e.target.value))}/></label><input aria-label="Zone free shipping threshold" type="number" min={0} className={input} placeholder="Free above ₹ (optional)" value={free} onChange={e=>setFree(e.target.value)}/><input aria-label="Preferred courier" className={input} placeholder="Preferred courier" value={courier} onChange={e=>setCourier(e.target.value)}/><label className="text-sm">Priority<input aria-label="Zone priority" type="number" className={input} value={priority} onChange={e=>setPriority(Number(e.target.value))}/></label></div>
      <Button type="button" disabled={busy||!name.trim()} onClick={()=>run({type:'zone',name,states:states.split(',').map(s=>s.trim()).filter(Boolean),pincode_prefixes:pins.split(',').map(s=>s.trim()).filter(Boolean),flat_rate:rate,free_above:free?Number(free):null,courier,priority})}><Plus className="h-4 w-4"/>Add shipping zone</Button>
      {d.zones.map(z=><div key={z.id} className="flex items-center gap-3 border-b border-border py-3 text-sm"><div><strong>{z.name}</strong><div className="text-muted-foreground text-xs">{z.states.join(', ')||'All states'} · {z.pincode_prefixes.join(', ')||'All postcodes'} · {z.courier||'Automatic courier'}</div></div><span className="ml-auto">₹{Number(z.flat_rate).toLocaleString('en-IN')}</span><Button type="button" size="icon" variant="ghost" aria-label={`Delete ${z.name}`} onClick={()=>remove('shipping_zones',z.id)}><Trash2 className="h-4 w-4"/></Button></div>)}
    </>}
    {mode==='audit' && <>
      <h3 className="font-display text-lg">Integration tokens</h3><div className="grid sm:grid-cols-2 gap-3"><input aria-label="Token name" className={input} placeholder="Token name" value={name} onChange={e=>setName(e.target.value)}/><select aria-label="Token scope" className={input} value={scope} onChange={e=>setScope(e.target.value as typeof scope)}><option value="catalog:read">Read catalog</option><option value="inventory:read">Read inventory</option></select></div><Button type="button" disabled={busy||!name.trim()} onClick={()=>run({type:'token',name,scope})}><KeyRound className="h-4 w-4"/>Create token</Button>
      {token&&<div role="status" className="border border-border p-3 rounded-md space-y-2"><p className="text-sm">Copy this token now. It will not be shown again.</p><input aria-label="New integration token" readOnly className={input+' font-mono'} value={token}/><Button type="button" variant="outline" onClick={()=>{navigator.clipboard.writeText(token);toast.success('Copied');}}>Copy</Button><Button type="button" variant="ghost" onClick={()=>setToken(null)}>Dismiss</Button></div>}
      <p className="text-xs text-muted-foreground">Read API: /api/public/integration/data · Bearer token · expires after 90 days.</p>
      {d.tokens.map(t=><div key={t.id} className="flex gap-3 items-center border-b border-border py-2 text-sm"><span>{t.name} · {t.scope} · {t.revoked_at?'Revoked':new Date(t.expires_at)<new Date()?'Expired':'Active'}</span><Button type="button" className="ml-auto" variant="outline" size="sm" disabled={!!t.revoked_at||busy} onClick={()=>run({type:'revoke',id:t.id})}>Revoke</Button></div>)}
      <h3 className="font-display text-lg pt-4">Activity history</h3><input aria-label="Search activity" className={input} placeholder="Filter action or record" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-border"><th className="py-3">Date</th><th>Action</th><th>Record</th><th>Actor</th></tr></thead><tbody>{d.activity.filter(a=>`${a.action} ${a.entity}`.toLowerCase().includes(search.toLowerCase())).map(a=><tr key={a.id} className="border-b border-border"><td className="py-2 pr-3 whitespace-nowrap">{new Date(a.created_at).toLocaleString('en-IN')}</td><td className="pr-3">{a.action}</td><td className="pr-3">{a.entity}</td><td>{d.customers.find(c=>c.id===a.actor_id)?.full_name??(a.actor_id?'Team member':'Store automation')}</td></tr>)}</tbody></table></div>
    </>}
    {mode==='recovery' && <>
      <p className="text-sm text-muted-foreground">Reminder consent and customer carts are stored. Automated recovery email delivery requires a marketing email service, verified sender, and scheduled sending setup; delivery is not active.</p>
      <div className="flex flex-wrap gap-3 text-sm"><span>{d.carts.filter(c=>!c.recovered_at&&Array.isArray(c.items)&&c.items.length).length} saved carts</span><span>{d.recovery.filter(r=>r.status==='sent').length} recovery emails sent</span></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-border"><th className="py-3">Customer</th><th>Updated</th><th>Consent</th><th>Status</th></tr></thead><tbody>{d.carts.map(c=><tr key={c.user_id} className="border-b border-border"><td className="py-3 pr-3">{c.email||d.customers.find(u=>u.id===c.user_id)?.full_name||'Customer'}</td><td className="pr-3">{new Date(c.updated_at).toLocaleString('en-IN')}</td><td>{c.recovery_consent?'Yes':'No'}</td><td>{c.recovered_at?'Recovered':'Saved'}</td></tr>)}</tbody></table></div>
      {d.carts.length===0&&<p className="text-sm text-muted-foreground">No saved customer carts.</p>}
    </>}
  </div>;
}