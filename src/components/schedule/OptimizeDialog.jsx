import React,{useEffect,useMemo,useState}from'react';
import{Sparkles,Loader2,Trash2,Lightbulb,ShieldAlert,CheckCircle2,Info,Users,Clock3}from'lucide-react';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription}from'@/components/ui/dialog';
import{base44}from'@/api/base44Client';

const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\bsvg\b/gi,' ').replace(/\s+/g,' ').trim();
const LEVEL_META={
 safe_cleanup:{label:'Safe cleanup candidate',icon:Trash2,wrap:'border-emerald-200 bg-emerald-50/40',badge:'bg-emerald-100 text-emerald-800'},
 planning_opportunity:{label:'Planning opportunity',icon:Lightbulb,wrap:'border-blue-200 bg-blue-50/40',badge:'bg-blue-100 text-blue-800'},
 educator_review:{label:'Educator / IEP review',icon:ShieldAlert,wrap:'border-amber-200 bg-amber-50/50',badge:'bg-amber-100 text-amber-900'}
};

export default function OptimizeDialog({open,onOpenChange}){
 const[loading,setLoading]=useState(false);
 const[result,setResult]=useState(null);

 useEffect(()=>{
  if(!open){setResult(null);return;}
  let cancelled=false;setLoading(true);
  base44.functions.invoke('scheduleAi',{mode:'optimize'})
   .then(res=>{if(!cancelled)setResult(res.data||{})})
   .catch(()=>{if(!cancelled)setResult({recommendations:[],summary:'CaseCue could not analyze the confirmed schedule right now. Try again in a moment.',data_notes:[]})})
   .finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[open]);

 const recs=useMemo(()=>(result?.recommendations||[]).map(r=>({
  ...r,
  title:clean(r.title),description:clean(r.description),reasoning:clean(r.reasoning),
  groups:(r.groups||[]).map(clean).filter(Boolean),
  evidence:(r.evidence||[]).map(clean).filter(Boolean),
  could_affect:(r.could_affect||[]).map(clean).filter(Boolean),
  verify_before_changing:(r.verify_before_changing||[]).map(clean).filter(Boolean)
 })),[result]);
 const counts=useMemo(()=>({
  safe:recs.filter(r=>r.review_level==='safe_cleanup').length,
  planning:recs.filter(r=>r.review_level==='planning_opportunity').length,
  review:recs.filter(r=>r.review_level==='educator_review').length
 }),[recs]);

 return<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className='max-h-[88vh] max-w-3xl overflow-y-auto'>
   <DialogHeader>
    <DialogTitle className='flex items-center gap-2'><Sparkles className='h-5 w-5 text-primary'/>Schedule Suggestions</DialogTitle>
    <DialogDescription>Evidence-backed cleanup and planning ideas from your confirmed CaseCue schedule. CaseCue does not move students, change services, or alter IEP decisions automatically.</DialogDescription>
   </DialogHeader>

   {loading&&<div className='py-12 text-center'><Loader2 className='mx-auto h-8 w-8 animate-spin text-primary'/><p className='mt-3 text-sm text-muted-foreground'>Checking confirmed groups, student assignments, goal data, and schedule conflicts…</p></div>}

   {result&&!loading&&<div className='space-y-4'>
    <div className='overflow-hidden rounded-2xl border bg-slate-950 text-white'>
     <div className='p-5'><div className='text-[10px] font-black uppercase tracking-[.18em] text-sky-300'>Schedule Intelligence</div><div className='mt-1 text-lg font-black'>{clean(result.summary)||'Schedule review complete.'}</div><p className='mt-2 text-xs leading-5 text-slate-300'>Suggestions are only shown when CaseCue has enough saved evidence to explain why it noticed something. You decide whether any change is appropriate.</p></div>
     <div className='grid grid-cols-3 gap-px bg-white/10'>
      <div className='bg-slate-950 p-3 text-center'><div className='text-xl font-black text-emerald-300'>{counts.safe}</div><div className='text-[10px] uppercase text-slate-300'>cleanup</div></div>
      <div className='bg-slate-950 p-3 text-center'><div className='text-xl font-black text-sky-300'>{counts.planning}</div><div className='text-[10px] uppercase text-slate-300'>planning</div></div>
      <div className='bg-slate-950 p-3 text-center'><div className='text-xl font-black text-amber-300'>{counts.review}</div><div className='text-[10px] uppercase text-slate-300'>educator review</div></div>
     </div>
    </div>

    {(result.data_notes||[]).length>0&&<div className='rounded-xl border border-sky-200 bg-sky-50 p-4'><div className='flex items-center gap-2 text-sm font-black text-sky-900'><Info className='h-4 w-4'/>Data limits CaseCue respected</div><div className='mt-2 space-y-1'>{result.data_notes.map((n,i)=><div key={i} className='text-xs leading-5 text-sky-800'>• {clean(n)}</div>)}</div></div>}

    {recs.map((r,i)=>{
     const meta=LEVEL_META[r.review_level]||LEVEL_META.educator_review,Icon=meta.icon;
     return<div key={i} className={'rounded-2xl border p-5 '+meta.wrap}>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
       <div className='min-w-0'><span className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider '+meta.badge}><Icon className='h-3.5 w-3.5'/>{meta.label}</span><h3 className='mt-2 text-base font-black text-slate-950'>{r.title}</h3><p className='mt-1 text-sm leading-6 text-slate-700'>{r.description}</p></div>
      </div>

      {r.groups?.length>0&&<div className='mt-3 flex flex-wrap gap-1.5'>{r.groups.map(g=><span key={g} className='rounded-full border bg-white px-2.5 py-1 text-xs font-bold text-slate-700'>{g}</span>)}</div>}

      <div className='mt-4 grid gap-3 lg:grid-cols-3'>
       <div className='rounded-xl border bg-white p-3'><div className='flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700'><CheckCircle2 className='h-3.5 w-3.5'/>Why CaseCue noticed it</div><div className='mt-2 space-y-1.5'>{r.evidence?.length?r.evidence.map((e,j)=><div key={j} className='text-xs leading-5 text-slate-700'>• {e}</div>):<div className='text-xs text-slate-400'>No supporting evidence was returned, so this suggestion should not be acted on.</div>}</div></div>
       <div className='rounded-xl border bg-white p-3'><div className='flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700'><Users className='h-3.5 w-3.5'/>What could be affected</div><div className='mt-2 space-y-1.5'>{r.could_affect?.length?r.could_affect.map((e,j)=><div key={j} className='text-xs leading-5 text-slate-700'>• {e}</div>):<div className='text-xs text-slate-400'>No downstream impact identified.</div>}</div></div>
       <div className='rounded-xl border bg-white p-3'><div className='flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700'><Clock3 className='h-3.5 w-3.5'/>Verify before changing</div><div className='mt-2 space-y-1.5'>{r.verify_before_changing?.length?r.verify_before_changing.map((e,j)=><div key={j} className='text-xs leading-5 text-slate-700'>• {e}</div>):<div className='text-xs text-slate-400'>Teacher review required.</div>}</div></div>
      </div>

      {r.reasoning&&<div className='mt-3 rounded-lg border border-dashed bg-white/70 px-3 py-2 text-xs leading-5 text-slate-600'><b>CaseCue logic:</b> {r.reasoning}</div>}
     </div>
    })}

    {!recs.length&&<div className='rounded-2xl border border-dashed p-8 text-center'><CheckCircle2 className='mx-auto h-8 w-8 text-emerald-500'/><div className='mt-2 font-black'>No evidence-backed change to recommend</div><p className='mx-auto mt-1 max-w-xl text-sm text-muted-foreground'>CaseCue will not manufacture optimization ideas just to fill this screen. Add confirmed goal data or source-class schedules if you want deeper grouping and timing analysis.</p></div>}
   </div>}
  </DialogContent>
 </Dialog>;
}
