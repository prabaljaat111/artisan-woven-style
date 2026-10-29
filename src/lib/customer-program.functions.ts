import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
export const customerRewards=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const [ledger,rules,profile]=await Promise.all([context.supabase.from('loyalty_ledger').select('points,reason,created_at').eq('user_id',context.userId).order('created_at',{ascending:false}),context.supabase.from('loyalty_rules').select('*').maybeSingle(),context.supabase.from('profiles').select('referral_code,referred_by').eq('id',context.userId).single()]);
  for(const r of [ledger,rules,profile])if(r.error)throw new Error(r.error.message);
  return {ledger:ledger.data??[],rules:rules.data,profile:profile.data};
});
export const rewardAction=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>z.discriminatedUnion('type',[z.object({type:z.literal('redeem'),points:z.number().int().positive()}),z.object({type:z.literal('referral'),code:z.string().max(40).optional()})]).parse(d)).handler(async({context,data})=>{
  const r=data.type==='redeem'?await context.supabase.rpc('redeem_reward_points',{_points:data.points}):await context.supabase.rpc('assign_referral',{_code:data.code??undefined});
  if(r.error)throw new Error(r.error.message);return r.data;
});
export const saveCustomerCart=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>z.object({items:z.array(z.object({id:z.string().max(100),name:z.string().max(300),slug:z.string().max(300),price:z.number().min(0),image:z.string().max(2000),size:z.string().max(40),color:z.string().max(80),qty:z.number().int().min(1).max(99)})).max(50),consent:z.boolean().optional()}).parse(d)).handler(async({context,data})=>{
  const {data:user,error:authError}=await context.supabase.auth.getUser();if(authError||!user.user)throw new Error('Sign in required');
  const old=await context.supabase.from('saved_customer_carts').select('items,recovery_consent').eq('user_id',context.userId).maybeSingle();if(old.error)throw new Error(old.error.message);
  const same=JSON.stringify(old.data?.items)===JSON.stringify(data.items);
  const {error}=await context.supabase.from('saved_customer_carts').upsert({user_id:context.userId,items:data.items,email:user.user.email,recovery_consent:data.consent??old.data?.recovery_consent??false,updated_at:same?undefined:new Date().toISOString(),recovered_at:data.items.length?null:new Date().toISOString()});
  if(error)throw new Error(error.message);return {ok:true};
});