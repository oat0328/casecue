import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{ArrowRight,Check,LockKeyhole,Sparkles}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAuth}from'@/lib/AuthContext';
import{WORKSPACES,workspaceHome,explicitUserWorkspaces,getActiveWorkspace}from'@/lib/workspaces';
import{Button}from'@/components/ui/button';
import{cn}from'@/lib/utils';

export default function WorkspaceSetup(){
 const{user,checkUserAuth}=useAuth(),navigate=useNavigate();
 const explicit=explicitUserWorkspaces(user);
 const alreadyConfigured=user?.role!=='admin'&&explicit.length>0;
 const current=getActiveWorkspace(user);
 const[selected,setSelected]=useState(current||'sped'),[saving,setSaving]=useState(false);

 const save=async()=>{
  setSaving(true);
  try{
   // First product selection grants ONE workspace. More products must be granted
   // by subscription/admin access; this page never silently adds another product.
   await base44.auth.updateMe({workspaces:[selected],active_workspace:selected,multi_workspace_access:false});
   await checkUserAuth();
   navigate(workspaceHome(selected),{replace:true});
  }finally{setSaving(false)}
 };

 if(alreadyConfigured){
  const w=WORKSPACES[current]||WORKSPACES[explicit[0]];
  return <div className="min-h-screen bg-slate-950 px-4 py-12 text-white"><div className="mx-auto max-w-2xl">
   <div className="mb-8 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><LockKeyhole className="h-5 w-5"/></div><div><div className="font-black">CaseCue</div><div className="text-xs text-slate-400">Workspace access</div></div></div>
   <div className="rounded-3xl border border-white/10 bg-white/[.04] p-7"><div className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Your product access</div><h1 className="mt-2 text-3xl font-black">{w?.name||'CaseCue'}</h1><p className="mt-3 text-slate-300">This account is licensed for this workspace only. Additional CaseCue workspaces require separate access or an approved multi-workspace plan.</p><Button className="mt-6 bg-blue-500 hover:bg-blue-600" onClick={()=>navigate(workspaceHome(current),{replace:true})}>Return to {w?.short||'workspace'}<ArrowRight className="ml-2 h-4 w-4"/></Button></div>
  </div></div>;
 }

 return <div className="min-h-screen bg-slate-950 px-4 py-12 text-white"><div className="mx-auto max-w-5xl">
  <div className="mb-8 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><Sparkles className="h-5 w-5"/></div><div><div className="font-black">CaseCue</div><div className="text-xs text-slate-400">Choose your CaseCue product</div></div></div>
  <h1 className="text-3xl font-black tracking-tight">Which workspace are you setting up?</h1>
  <p className="mt-2 max-w-2xl text-slate-400">Your initial access includes one CaseCue workspace. Choose the product this account should use. Additional workspaces require separate access or an approved multi-workspace plan.</p>
  <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.values(WORKSPACES).map(w=><button key={w.key} disabled={w.beta} onClick={()=>!w.beta&&setSelected(w.key)} className={cn("relative rounded-2xl border p-5 text-left transition",w.beta?"cursor-not-allowed border-white/10 bg-white/[.02] opacity-55":selected===w.key?"border-blue-400 bg-blue-500/10":"border-white/10 bg-white/[.04] hover:bg-white/[.07]")}><div className="flex items-center gap-2"><div className="font-black">{w.name}</div>{w.beta&&<span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-300">Private beta</span>}</div><div className="mt-2 text-sm leading-5 text-slate-400">{w.description}</div>{selected===w.key&&!w.beta&&<span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500"><Check className="h-4 w-4"/></span>}</button>)}</div>
  <Button onClick={save} disabled={saving} className="mt-8 h-12 bg-blue-500 px-6 hover:bg-blue-600">{saving?'Setting up…':<>Enter {WORKSPACES[selected].name}<ArrowRight className="ml-2 h-4 w-4"/></>}</Button>
 </div></div>;
}
