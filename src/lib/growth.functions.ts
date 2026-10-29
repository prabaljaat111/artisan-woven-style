import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireAdmin } from './admin-middleware';
import type { Database } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const growthOverview=createServerFn({method:'GET'}).middleware([requireAdmin]).handler(async({context})=>{
  const db=context.supabase as SupabaseClient<Database>;
  const result=await Promise.all([
    db.from('customer_groups').select('*').order('name'),
    db.from('profiles').select('id,full_name,customer_group_id,referral_code,referred_by').order('created_at',{ascending:false}).limit(500),
    db.from('loyalty_ledger').select('*').order('created_at',{ascending:false}).limit(1000),
    db.from('lead_routing_rules').select('*').order('priority',{ascending:false}),
    db.from('shipping_zones').select('*').order('priority',{ascending:false}),
    db.from('admin_activity_log').select('*').order('created_at',{ascending:false}).limit(200),
    db.from('integration_tokens').select('id,name,scope,created_at,expires_at,revoked_at').order('created_at',{ascending:false}),
    db.from('saved_customer_carts').select('*').order('updated_at',{ascending:false}).limit(100),
    db.from('cart_recovery_deliveries').select('*').order('created_at',{ascending:false}).limit(100),
  ]);
  for(const r of result) if(r.error) throw new Error(r.error.message);
  return {groups:result[0].data??[],customers:result[1].data??[],points:result[2].data??[],routing:result[3].data??[],zones:result[4].data??[],activity:result[5].data??[],tokens:result[6].data??[],carts:result[7].data??[],recovery:result[8].data??[]};
});
const action=z.discriminatedUnion('type',[
  z.object({type:z.literal('group'),name:z.string().trim().min(1).max(80),description:z.string().max(500)}),
  z.object({type:z.literal('membership'),user_id:z.string().uuid(),group_id:z.string().uuid().nullable()}),
  z.object({type:z.literal('points'),user_id:z.string().uuid(),points:z.number().int().min(1).max(100000),reason:z.string().trim().min(1).max(300)}),
  z.object({type:z.literal('routing'),source:z.string().max(100),category:z.string().max(100),assigned_to:z.string().uuid(),priority:z.number().int()}),
  z.object({type:z.literal('zone'),name:z.string().trim().min(1).max(80),states:z.array(z.string().max(80)),pincode_prefixes:z.array(z.string().regex(/^\d{1,6}$/)),flat_rate:z.number().min(0).max(10000),free_above:z.number().min(0).nullable(),courier:z.string().max(100),priority:z.number().int()}),
  z.object({type:z.literal('delete'),entity:z.enum(['customer_groups','lead_routing_rules','shipping_zones']),id:z.string().uuid()}),
  z.object({type:z.literal('token'),name:z.string().trim().min(1).max(80),scope:z.enum(['catalog:read','inventory:read'])}),
  z.object({type:z.literal('revoke'),id:z.string().uuid()}),
]);
export type GrowthActionInput=z.infer<typeof action>;
export const growthAction=createServerFn({method:'POST'}).middleware([requireAdmin]).inputValidator(input=>action.parse(input)).handler(async({data,context})=>{
  const db=context.supabase as SupabaseClient<Database>;
  let error;
  if(data.type==='group') ({error}=await db.from('customer_groups').insert({name:data.name,description:data.description}));
  if(data.type==='membership') ({error}=await db.from('profiles').update({customer_group_id:data.group_id}).eq('id',data.user_id));
  if(data.type==='points') ({error}=await db.from('loyalty_ledger').insert({user_id:data.user_id,points:data.points,reason:data.reason,created_by:context.userId}));
  if(data.type==='routing') {
    const team=await db.from('user_roles').select('role').eq('user_id',data.assigned_to).in('role',['admin','manager','staff']);
    if(team.error||!team.data?.length) throw new Error('Choose a staff member, manager, or admin for lead assignment');
    const {type,...row}=data; ({error}=await db.from('lead_routing_rules').insert(row));
  }
  if(data.type==='zone') {const {type,...row}=data; ({error}=await db.from('shipping_zones').insert(row));}
  if(data.type==='delete') ({error}=await db.from(data.entity).delete().eq('id',data.id));
  if(data.type==='revoke') ({error}=await db.from('integration_tokens').update({revoked_at:new Date().toISOString()}).eq('id',data.id));
  if(data.type==='token') {
    const token=`ihs_${crypto.randomUUID().replaceAll('-','')}${crypto.randomUUID().replaceAll('-','')}`;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
    const token_hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const r=await db.from('integration_tokens').insert({name:data.name,scope:data.scope,token_hash,created_by:context.userId});
    if(r.error) throw new Error(r.error.message);
    return {ok:true,token};
  }
  if(error) throw new Error(error.message);
  return {ok:true,token:null};
});