import React,{useEffect,useMemo,useState}from'react';
import{Outlet}from'react-router-dom';
import{Loader2,LockKeyhole,ShieldCheck}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAuth}from'@/lib/AuthContext';
import BillingCard from'@/components/settings/BillingCard';

const endOfDay=value=>value?new Date(`${value}T23:59:59`):null;

export default function SubscriptionGate(){
 const{user}=useAuth();
 const[ctx,setCtx]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let live=true;(async()=>{try{const r=await base44.functions.invoke('orgContext',{});if(live)setCtx(r?.data||r)}catch(e){if(live)setError(e?.message||'Could not verify access.')}finally{if(live)setLoading(false)}})();return()=>{live=false}},[user?.organization_id,user?.data?.organization_id,user?.plan,user?.data?.plan]);

 const access=useMemo(()=>{
   const userPlan=user?.plan||user?.data?.plan||'trial';
   if(userPlan==='founding_teacher')return{allowed:true,label:'Paid'};
   const s=ctx?.subscription;
   if(!s)return{allowed:true,label:'Account'};
   if(s.status==='demo')return{allowed:true,label:'Demo'};
   if(s.status==='active')return{allowed:true,label:'Active'};
   if(s.status==='complimentary'){
     const end=endOfDay(s.complimentary_end);
     return{allowed:!end||end>=new Date(),label:'Complimentary'};
   }
   if(s.status==='trialing'){
     const end=endOfDay(s.trial_end);
     return{allowed:!end||end>=new Date(),label:'Trial',trialEnd:s.trial_end};
   }
   return{allowed:false,label:s.status||'Expired'};
 },[ctx,user]);

 if(loading)return <div className="min-h-screen grid place-items-center bg-slate-50"><div className="text-center text-slate-500"><Loader2 className="mx-auto h-6 w-6 animate-spin"/><div className="mt-2 text-sm">Opening CaseCue…</div></div></div>;
 if(error)return <Outlet/>;
 if(access.allowed)return <Outlet/>;

 return <div className="min-h-screen bg-slate-50 px-4 py-10">
   <div className="mx-auto max-w-2xl">
     <div className="rounded-3xl bg-slate-950 p-7 text-white">
       <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-sky-300"><ShieldCheck className="h-4 w-4"/>Your CaseCue data is still here</div>
       <h1 className="mt-3 text-3xl font-black">Your trial has ended.</h1>
       <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">We have not deleted your workspace. Start a subscription to reopen the educator tools, or contact CaseCue if you believe your organization already has access.</p>
     </div>
     <div className="mt-5">
       <BillingCard/>
     </div>
     <div className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
       <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>
       Billing access does not change school authorization requirements for identifiable student information.
     </div>
   </div>
 </div>;
}
