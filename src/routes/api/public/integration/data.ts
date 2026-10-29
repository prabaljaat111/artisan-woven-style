import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/api/public/integration/data')({server:{handlers:{GET:async({request})=>{
  const token=request.headers.get('authorization')?.match(/^Bearer (ihs_[a-f0-9]{64})$/)?.[1];
  if(!token)return new Response('Unauthorized',{status:401});
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const token_hash=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:access,error}=await supabaseAdmin.from('integration_tokens').select('scope,expires_at,revoked_at').eq('token_hash',token_hash).maybeSingle();
  if(error)return new Response('Access check failed',{status:503});
  if(!access||access.revoked_at||Date.parse(access.expires_at)<=Date.now())return new Response('Unauthorized',{status:401});
  if(access.scope==='catalog:read') {
    const {loadFeedRows}=await import('@/lib/feed.server');
    return Response.json({products:await loadFeedRows()},{headers:{'Cache-Control':'no-store'}});
  }
  if(access.scope==='inventory:read'){
    const {data,error}=await supabaseAdmin.from('products').select('id,name,sku,stock,product_variants(id,sku,size,color,stock,status)').is('deleted_at',null).order('id').limit(1000);
    if(error)return new Response('Inventory unavailable',{status:503});
    return Response.json({products:data},{headers:{'Cache-Control':'no-store'}});
  }
  return new Response('Forbidden',{status:403});
}}}});