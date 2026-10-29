import { useEffect,useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

export function TwoFactorSettings({challengeOnly=false,onVerified}:{challengeOnly?:boolean;onVerified?:()=>void}){
  const [factors,setFactors]=useState<{id:string;friendly_name?:string;status:string}[]>([]);
  const [enrollment,setEnrollment]=useState<{id:string;qr:string;secret:string}|null>(null);
  const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [verified,setVerified]=useState(false);
  const load=async()=>{
    const {data,error}=await supabase.auth.mfa.listFactors();
    if(error) {toast.error(error.message);return;}
    setFactors(data.totp);
    const level=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();setVerified(level.data?.currentLevel==='aal2');
  };
  useEffect(()=>{load();},[]);
  const enroll=async()=>{
    setBusy(true);try{
      for(const f of factors.filter(f=>f.status==='unverified')) {const r=await supabase.auth.mfa.unenroll({factorId:f.id});if(r.error) throw r.error;}
      const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'IHS Admin',issuer:'Indian Handicraft Standards'});
      if(error) throw error;
      setEnrollment({id:data.id,qr:data.totp.qr_code,secret:data.totp.secret});
    }catch(e){toast.error(e instanceof Error?e.message:'Could not enroll');}finally{setBusy(false);}
  };
  const verify=async()=>{
    const id=enrollment?.id??factors.find(f=>f.status==='verified')?.id;if(!id)return;
    setBusy(true);try{const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:id,code});if(error)throw error;setCode('');setEnrollment(null);await load();toast.success('Two-factor verification complete');onVerified?.();}catch(e){toast.error(e instanceof Error?e.message:'Invalid code');}finally{setBusy(false);}
  };
  const active=factors.some(f=>f.status==='verified');
  return <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-5 w-5 text-primary"/>{active?(verified?'Two-factor authentication enabled · session verified':'Two-factor authentication enabled'):'Two-factor authentication not enrolled'}</div>
    {!active&&!enrollment&&!challengeOnly&&<Button type="button" disabled={busy} onClick={enroll}>Set up authenticator</Button>}
    {enrollment&&<><img className="w-48 h-48 object-contain bg-card" src={enrollment.qr} alt="Authenticator enrollment QR code"/><p className="text-sm text-muted-foreground">Scan with your authenticator app, or enter this setup key.</p><input readOnly aria-label="Authenticator setup key" className="w-full font-mono border border-border rounded-md px-3 py-2 bg-background text-sm" value={enrollment.secret}/></>}
    {(enrollment||(active&&!verified))&&<div className="flex gap-2"><input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="border border-border rounded-md px-3 py-2 bg-background text-sm w-40" placeholder="6-digit code"/><Button type="button" disabled={busy||code.length!==6} onClick={verify}>Verify code</Button></div>}
    {active&&verified&&!challengeOnly&&<Button type="button" variant="outline" disabled={busy} onClick={async()=>{if(!window.confirm('Remove your authenticator?'))return;setBusy(true);const id=factors.find(f=>f.status==='verified')?.id;if(id){const r=await supabase.auth.mfa.unenroll({factorId:id});if(r.error)toast.error(r.error.message);else await load();}setBusy(false);}}>Remove authenticator</Button>}
    {!challengeOnly&&<p className="text-xs text-muted-foreground">Keep your authenticator backed up. Enrollment secrets are not stored by this website.</p>}
  </div>;
}