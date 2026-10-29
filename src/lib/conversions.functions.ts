import {createServerFn} from '@tanstack/react-start';
import {requireAdmin} from './admin-middleware';
import {analyticsConfig} from './analytics-config';
export const conversionStatus=createServerFn({method:'GET'}).middleware([requireAdmin]).handler(async({context})=>{
  const {data,error}=await context.supabase.from('conversion_events').select('id,event_name,event_key,ga4_status,meta_status,last_error,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)throw new Error(error.message);
  return {events:data,ga4Ready:!!process.env.GA4_MEASUREMENT_API_SECRET,metaReady:!!process.env.META_CAPI_ACCESS_TOKEN};
});
export const dispatchConversions=createServerFn({method:'POST'}).middleware([requireAdmin]).handler(async({context})=>{
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const settings=await context.supabase.from('app_settings').select('value').eq('key','analytics').maybeSingle();if(settings.error)throw new Error(settings.error.message);
  const config=analyticsConfig(settings.data?.value);const gaSecret=process.env.GA4_MEASUREMENT_API_SECRET;const metaSecret=process.env.META_CAPI_ACCESS_TOKEN;
  if(!gaSecret&&!metaSecret)throw new Error('Connect the GA4 Measurement API secret or Meta conversion access token first.');
  const {data:events,error}=await supabaseAdmin.from('conversion_events').select('*').or('ga4_status.eq.pending,meta_status.eq.pending').order('created_at').limit(20);if(error)throw new Error(error.message);
  let sent=0;const failures:string[]=[];
  for(const e of events??[]){
    const payload=e.payload as Record<string,unknown>;
    const patch:{ga4_status?:string;meta_status?:string;last_error?:string|null}={};
    if(gaSecret&&config.ga4_id&&e.ga4_status==='pending'){
      const r=await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(config.ga4_id)}&api_secret=${encodeURIComponent(gaSecret)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:e.id,events:[{name:e.event_name==='Purchase'?'purchase':e.event_name==='Lead'?'generate_lead':'add_to_cart',params:{...payload,event_id:e.event_key}}]})});
      if(r.ok){patch.ga4_status='accepted';sent++;}else{const body=await r.text();console.error(`GA4 conversion failed [${r.status}]: ${body}`);patch.last_error=`GA4 ${r.status}: ${body}`;failures.push(`GA4 ${r.status}`);}
    }
    if(metaSecret&&config.meta_pixel_id&&e.meta_status==='pending'){
      const eventSeconds=Math.floor(Date.parse(e.created_at)/1000);
      if(Date.now()/1000-eventSeconds>7*86400){patch.meta_status='expired';patch.last_error='Meta events must be sent within seven days';}
      else {
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(e.event_key));const externalId=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
        const r=await fetch(`https://graph.facebook.com/v25.0/${config.meta_pixel_id}/events`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${metaSecret}`},body:JSON.stringify({data:[{event_name:e.event_name,event_time:eventSeconds,event_id:e.event_key,action_source:'website',event_source_url:'https://indianhandicraftstandards.com',user_data:{external_id:[externalId]},custom_data:payload}]})});
        const body=await r.text();if(r.ok){patch.meta_status='accepted';sent++;}else{console.error(`Meta conversion failed [${r.status}]: ${body}`);patch.last_error=`Meta ${r.status}: ${body}`;failures.push(`Meta ${r.status}`);}
      }
    }
    if(Object.keys(patch).length){const saved=await supabaseAdmin.from('conversion_events').update(patch).eq('id',e.id);if(saved.error)throw new Error(saved.error.message);}
  }
  return {sent,failures};
});