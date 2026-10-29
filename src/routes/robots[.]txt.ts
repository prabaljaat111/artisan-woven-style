import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/robots.txt')({server:{handlers:{GET:async()=>{
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data,error}=await supabaseAdmin.from('app_settings').select('key,value').in('key',['seo.crawling','seo']);
  if(error)return new Response('Crawler rules unavailable',{status:503});
  const seo=data?.find(r=>r.key==='seo')?.value as {noindex_site?:boolean}|undefined;
  const crawling=data?.find(r=>r.key==='seo.crawling')?.value as {robots_extra?:string}|undefined;
  const extra=(crawling?.robots_extra??'').split('\n').filter(l=>/^Disallow:\s*\/[a-zA-Z0-9/_.*-]*$/.test(l.trim())).join('\n');
  const text=`User-agent: *\n${seo?.noindex_site?'Disallow: /':'Allow: /\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nDisallow: /wishlist\nDisallow: /login\nDisallow: /signup\nDisallow: /rewards'}\n${extra}\nSitemap: https://indianhandicraftstandards.com/sitemap.xml\n`;
  return new Response(text,{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
}}}});