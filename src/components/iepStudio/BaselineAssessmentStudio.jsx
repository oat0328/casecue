import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardCheck, Sparkles, Printer, Save, BarChart3, Target, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

const DOMAINS=["Reading","Writing","Math","Executive Function","Social-Emotional / Behavior","Communication","Functional / Adaptive"];
const localISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const prettyDate=v=>{if(!v)return 'Not entered';const [y,m,d]=String(v).split('-');return y&&m&&d?`${m}/${d}/${y}`:v};

export default function BaselineAssessmentStudio({student}){
  const {toast}=useToast();
  const [domains,setDomains]=useState(["Reading","Writing","Math"]);
  const [itemsPerDomain,setItemsPerDomain]=useState(6);
  const [records,setRecords]=useState([]);
  const [current,setCurrent]=useState(null);
  const [busy,setBusy]=useState(false);
  const [scored,setScored]=useState({});
  const [goalSaved,setGoalSaved]=useState({});

  const load=async(selectId='')=>{
    const rows=await base44.entities.BaselineAssessment.filter({student_id:student.id},'-created_date',50);
    setRecords(rows||[]);
    const pick=(rows||[]).find(x=>x.id===selectId)||(rows||[])[0]||null;
    setCurrent(pick);
  };
  useEffect(()=>{setCurrent(null);setScored({});setGoalSaved({});load().catch(()=>setRecords([]));},[student.id]);
  useEffect(()=>{
    const map={}; for(const r of current?.results?.items||[]) map[r.item_id]={earned_points:r.earned_points??'',teacher_note:r.teacher_note||''}; setScored(map);
  },[current?.id]);

  const assessment=current?.assessment||null;
  const allItems=useMemo(()=>{const out=[];for(const d of assessment?.domains||[])for(const i of d.items||[])out.push({...i,domain:d.domain});return out;},[assessment]);
  const totals=useMemo(()=>{
    const out={}; for(const i of allItems){const e=Number(scored[i.id]?.earned_points);if(!out[i.domain])out[i.domain]={earned:0,possible:0,scored:0,count:0};out[i.domain].possible+=Number(i.max_points||0);out[i.domain].count++;if(scored[i.id]?.earned_points!==''&&Number.isFinite(e)){out[i.domain].earned+=Math.max(0,Math.min(Number(i.max_points||0),e));out[i.domain].scored++;}}
    return out;
  },[allItems,scored]);

  const toggle=d=>setDomains(v=>v.includes(d)?v.filter(x=>x!==d):[...v,d]);
  const generate=async()=>{
    if(!domains.length)return toast({title:'Choose at least one assessment area',variant:'destructive'});
    setBusy(true);try{
      const r=await base44.functions.invoke('generateBaselineAssessment',{student_id:student.id,domains,items_per_domain:Number(itemsPerDomain)});
      const a=r.data?.assessment||r.assessment;
      if(!a?.domains?.length)throw new Error('No assessment items were returned.');
      const rec=await base44.entities.BaselineAssessment.create({student_id:student.id,title:a.title||`${student.first_name} Baseline Assessment`,grade:student.grade||'',domains,status:'ready',assessment:a,results:{items:[]},administered_date:localISO()});
      await load(rec.id); toast({title:'Baseline assessment created',description:'Review the original items before administering. Print it or score it directly in CaseCue after the student completes it.'});
    }catch(e){toast({title:'Could not create baseline assessment',description:e?.response?.data?.error||e.message,variant:'destructive'})}finally{setBusy(false)}
  };
  const saveScores=async({quiet=false,requireComplete=false}={})=>{
    if(!current)throw new Error('No baseline assessment is selected.');
    const items=allItems.map(i=>{const raw=scored[i.id]?.earned_points;const n=Number(raw);return {item_id:i.id,earned_points:raw===''||raw==null||!Number.isFinite(n)?null:Math.max(0,Math.min(Number(i.max_points||0),n)),teacher_note:scored[i.id]?.teacher_note||''}}).filter(x=>x.earned_points!=null);
    if(!items.length){const e=new Error('Enter at least one scored item.');if(!quiet)toast({title:e.message,variant:'destructive'});throw e;}
    if(requireComplete&&items.length!==allItems.length){const e=new Error(`Complete all baseline items before evaluation. ${items.length} of ${allItems.length} items are scored.`);if(!quiet)toast({title:'Baseline is incomplete',description:e.message,variant:'destructive'});throw e;}
    setBusy(true);try{await base44.entities.BaselineAssessment.update(current.id,{results:{items},status:'completed'});await load(current.id);if(!quiet)toast({title:'Baseline scores saved',description:`${items.length} scored item${items.length===1?'':'s'} saved. CaseCue will only analyze what you scored.`});return items;}catch(e){if(!quiet)toast({title:'Could not save scores',description:e.message,variant:'destructive'});throw e;}finally{setBusy(false)}
  };
  const analyze=async()=>{
    if(!current)return;setBusy(true);try{await saveScores({quiet:true,requireComplete:true});const r=await base44.functions.invoke('evaluateBaselineAssessment',{assessment_id:current.id});const analysis=r.data?.analysis||r.analysis;if(!analysis)throw new Error('No analysis was returned.');await base44.entities.BaselineAssessment.update(current.id,{analysis,status:'analyzed'});await load(current.id);toast({title:'Baseline evaluation ready',description:'Present levels and measurable goal options are ready for educator review.'});}catch(e){toast({title:'Could not evaluate baseline',description:e?.response?.data?.error||e.message,variant:'destructive'})}finally{setBusy(false)}
  };
  const savePresentLevels=async()=>{
    const draft=current?.analysis?.present_levels_draft;if(!draft)return;
    const date=prettyDate(current.administered_date);const existing=String(student.present_levels||'').trim();const next=existing?`${existing}\n\nBaseline update ${date}:\n${draft}`:draft;
    if(!window.confirm('Save this reviewed baseline draft to Student 360 Present Levels? Existing present levels will be preserved and this update will be appended.'))return;
    try{await base44.entities.Student.update(student.id,{present_levels:next});toast({title:'Reviewed present levels saved',description:'The baseline update was appended to Student 360. Official IEP language still requires team review.'});}catch(e){toast({title:'Could not save present levels',description:e.message,variant:'destructive'})}
  };
  const saveGoal=async(g,i)=>{
    try{const me=await base44.auth.me();const organization_id=me?.organization_id||me?.data?.organization_id||student.organization_id||'';const created=await base44.entities.Goal.create({student_id:student.id,organization_id,goal_area:g.goal_area||'',goal_text:g.goal_text||'',baseline:g.baseline||'',target:g.target||'',condition:g.condition||'',criterion:g.criterion||'',measurement_method:g.measurement_method||'',progress_monitoring_method:g.progress_monitoring_method||'',status:'revision'});setGoalSaved(v=>({...v,[i]:created.id}));toast({title:'Goal saved as revision draft',description:'Review and approve it through your IEP process before making it active.'});}catch(e){toast({title:'Could not save goal draft',description:e.message,variant:'destructive'})}
  };
  const print=()=>window.print();

  return <div className="space-y-5">
    <Card className="overflow-hidden border-indigo-100">
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-300">Baseline → PLAAFP → Goals</div><h3 className="mt-1 text-2xl font-black">Baseline Assessment Studio</h3><p className="mt-2 max-w-3xl text-sm text-slate-300">Generate an original skill probe, score the student's actual performance, then turn the verified baseline into educator-review present levels and measurable goal drafts.</p></div><ClipboardCheck className="h-11 w-11 text-indigo-300"/></div></div>
      <div className="p-6"><div className="text-sm font-black">1. Choose baseline areas</div><div className="mt-3 flex flex-wrap gap-2">{DOMAINS.map(d=><button key={d} type="button" onClick={()=>toggle(d)} className={`rounded-full border px-3 py-2 text-xs font-bold ${domains.includes(d)?'border-blue-600 bg-blue-50 text-blue-800':'bg-white text-slate-600'}`}>{domains.includes(d)?'✓ ':''}{d}</button>)}</div><div className="mt-4 flex flex-wrap items-end gap-3"><div><Label>Items per area</Label><Input className="w-32" type="number" min="3" max="12" value={itemsPerDomain} onChange={e=>setItemsPerDomain(e.target.value)}/></div><Button onClick={generate} disabled={busy} className="bg-slate-950 text-white"><Sparkles className="mr-2 h-4 w-4"/>{busy?'Working…':'Generate Baseline'}</Button></div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><b>Instructional baseline only.</b> This does not replace a standardized evaluation or determine eligibility. CaseCue creates original items and requires educator review before administration or IEP use.</div></div>
    </Card>

    {records.length>0&&<Card className="p-4"><div className="flex flex-wrap items-center gap-3"><div className="text-sm font-bold">Saved baselines</div><select className="h-10 min-w-[280px] rounded-lg border bg-white px-3 text-sm" value={current?.id||''} onChange={e=>{const r=records.find(x=>x.id===e.target.value);setCurrent(r||null)}}>{records.map(r=><option key={r.id} value={r.id}>{r.title||'Baseline Assessment'} · {prettyDate(r.administered_date)} · {r.status}</option>)}</select><Button variant="outline" size="sm" onClick={()=>load(current?.id)}><RefreshCw className="mr-1 h-3.5 w-3.5"/>Refresh</Button></div></Card>}

    {assessment&&<Card className="p-6 baseline-print-area"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">2. Administer & score</div><h3 className="text-xl font-black">{current.title||assessment.title}</h3><p className="text-xs text-slate-500">{student.first_name} {student.last_name} · Grade {student.grade||'—'} · {prettyDate(current.administered_date)}</p></div><Button variant="outline" onClick={print}><Printer className="mr-1 h-4 w-4"/>Print assessment</Button></div><p className="mt-4 text-sm text-slate-600">{assessment.directions}</p><div className="mt-5 space-y-6">{(assessment.domains||[]).map(d=><div key={d.domain}><div className="mb-2 flex items-center justify-between"><h4 className="font-black">{d.domain}</h4>{totals[d.domain]&&<span className="text-xs font-bold text-slate-500">Scored {totals[d.domain].scored}/{totals[d.domain].count} · {totals[d.domain].earned}/{totals[d.domain].possible} pts</span>}</div><div className="space-y-3">{(d.items||[]).map((i,n)=><div key={i.id} className="rounded-2xl border p-4"><div className="flex gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{n+1}</div><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">{i.skill} · {i.max_points} point{i.max_points===1?'':'s'}</div><div className="mt-1 whitespace-pre-wrap text-sm font-medium">{i.prompt}</div>{i.choices?.length>0&&<div className="mt-2 grid gap-1 sm:grid-cols-2">{i.choices.map((c,k)=><div key={k} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">{String.fromCharCode(65+k)}. {c}</div>)}</div>}<details className="mt-3 print:hidden"><summary className="cursor-pointer text-xs font-bold text-slate-500">Teacher answer key / scoring guide</summary><div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs"><b>Expected:</b> {i.answer_key}<br/><b>Score:</b> {i.scoring_guidance}</div></details><div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr] print:hidden"><div><Label>Points earned</Label><Input type="number" min="0" max={i.max_points} value={scored[i.id]?.earned_points??''} onChange={e=>setScored(v=>({...v,[i.id]:{...(v[i.id]||{}),earned_points:e.target.value}}))}/></div><div><Label>Teacher observation / error note</Label><Input value={scored[i.id]?.teacher_note||''} onChange={e=>setScored(v=>({...v,[i.id]:{...(v[i.id]||{}),teacher_note:e.target.value}}))} placeholder="Example: solved single-digit multiplication independently; regrouping errors on 2-digit items"/></div></div></div></div></div>)}</div></div>)}</div><div className="mt-5 flex flex-wrap gap-2 print:hidden"><Button variant="outline" onClick={()=>saveScores()} disabled={busy}><Save className="mr-1 h-4 w-4"/>Save scores</Button><Button onClick={analyze} disabled={busy} className="bg-blue-700 text-white"><BarChart3 className="mr-1 h-4 w-4"/>{busy?'Evaluating…':'Evaluate Baseline & Draft PLAAFP/Goals'}</Button></div></Card>}

    {current?.analysis&&<div className="space-y-4"><Card className="p-6 border-emerald-200 bg-emerald-50/30"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700"/><div><div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">3. Baseline evaluation</div><h3 className="text-xl font-black">Verified performance → educator-review drafts</h3><p className="mt-2 text-sm text-slate-700">{current.analysis.overall_summary}</p></div></div></Card>
      <div className="grid gap-4 xl:grid-cols-2">{(current.analysis.domain_results||[]).map(d=><Card key={d.domain} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{d.domain}</div><div className="mt-1 text-2xl font-black text-blue-700">{d.earned}/{d.possible} · {d.percentage}%</div></div></div><div className="mt-3 text-sm leading-6">{d.present_level}</div>{d.strengths?.length>0&&<div className="mt-3 text-xs text-emerald-800"><b>Strengths:</b> {d.strengths.join(' · ')}</div>}{d.needs?.length>0&&<div className="mt-2 text-xs text-amber-800"><b>Needs:</b> {d.needs.join(' · ')}</div>}{d.data_limitations?.length>0&&<div className="mt-2 text-xs text-slate-500"><b>Limitations:</b> {d.data_limitations.join(' · ')}</div>}</Card>)}</div>
      <Card className="p-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Present Levels Draft</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6">{current.analysis.present_levels_draft}</div></div><Button className="shrink-0" onClick={savePresentLevels}>Save reviewed PLAAFP</Button></div></Card>
      <Card className="p-6"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-blue-700"/><h3 className="text-lg font-black">Goal drafts from the baseline</h3></div><p className="mt-1 text-sm text-slate-500">Only areas with a measurable starting point and defensible need should appear here. Targets are suggestions for educator/IEP-team review.</p><div className="mt-4 space-y-3">{(current.analysis.goal_drafts||[]).map((g,i)=><div key={i} className="rounded-2xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="font-black">{g.goal_area}</div><p className="mt-2 text-sm font-semibold">{g.goal_text}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-xs"><div className="rounded-xl bg-slate-50 p-3"><b>Baseline</b><div className="mt-1">{g.baseline}</div></div><div className="rounded-xl bg-slate-50 p-3"><b>Suggested target</b><div className="mt-1">{g.target||g.criterion}</div></div><div className="rounded-xl bg-slate-50 p-3"><b>Measure</b><div className="mt-1">{g.measurement_method}</div></div><div className="rounded-xl bg-slate-50 p-3"><b>Progress monitoring</b><div className="mt-1">{g.progress_monitoring_method}</div></div></div><div className="mt-2 text-xs text-slate-500">Confidence: {g.confidence} · {g.rationale}</div></div><Button variant={goalSaved[i]?'outline':'default'} disabled={!!goalSaved[i]} onClick={()=>saveGoal(g,i)}>{goalSaved[i]?<><CheckCircle2 className="mr-1 h-4 w-4"/>Saved</>:<>Save as revision goal</>}</Button></div></div>)}{!(current.analysis.goal_drafts||[]).length&&<div className="rounded-xl border border-dashed p-5 text-sm text-slate-500">No defensible goal draft was created from this baseline. Review the follow-up data recommendations instead of forcing a goal.</div>}</div></Card>
      {(current.analysis.recommended_follow_up?.length>0||current.analysis.cautions?.length>0)&&<Card className="p-5 border-amber-200 bg-amber-50/40"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-700"/><div className="text-sm"><div className="font-black">Review before IEP use</div>{current.analysis.recommended_follow_up?.length>0&&<div className="mt-2"><b>More data:</b> {current.analysis.recommended_follow_up.join(' · ')}</div>}{current.analysis.cautions?.length>0&&<div className="mt-2"><b>Cautions:</b> {current.analysis.cautions.join(' · ')}</div>}</div></div></Card>}
    </div>}
  </div>;
}
