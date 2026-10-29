import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {useState} from 'react';
import {conversionStatus,dispatchConversions} from '@/lib/conversions.functions';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
export function ConversionTools(){
  const q=useQuery({queryKey:['conversions'],queryFn:()=>conversionStatus()});
  const qc=useQueryClient();const send=useServerFn(dispatchConversions);const [busy,setBusy]=useState(false);
  const dispatch=async()=>{
    setBusy(true);
    try{const r=await send();toast.success(`${r.sent} event requests accepted`);if(r.failures.length)toast.error(r.failures.join(', '));await qc.invalidateQueries({queryKey:['conversions']});}
    catch(e){toast.error(e instanceof Error?e.message:'Could not send');}
    finally{setBusy(false);}
  };
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-3 text-sm"><span>GA4 server events: {q.data?.ga4Ready?'Secret configured':'Setup required'}</span><span>Meta server events: {q.data?.metaReady?'Secret configured':'Setup required'}</span></div>
    <Button type="button" disabled={busy||(!q.data?.ga4Ready&&!q.data?.metaReady)} onClick={dispatch}>Send pending events</Button>
    <p className="text-sm text-muted-foreground">Purchase and Lead events are recorded automatically. Provider delivery needs the GA4 Measurement API secret or Meta conversion access token. Accepted requests do not confirm attribution.</p>
    {q.error&&<p role="alert" className="text-destructive text-sm">{q.error.message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-border"><th className="py-3">Event</th><th>Date</th><th>GA4</th><th>Meta</th></tr></thead><tbody>{q.data?.events.map(e=><tr key={e.id} className="border-b border-border"><td className="py-2">{e.event_name}</td><td>{new Date(e.created_at).toLocaleString('en-IN')}</td><td>{e.ga4_status}</td><td>{e.meta_status}</td></tr>)}</tbody></table></div>
    {q.data?.events.length===0&&<p className="text-sm text-muted-foreground">No conversion events recorded yet.</p>}
  </div>;
}