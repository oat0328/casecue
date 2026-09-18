import React from'react';
import{Target,ShieldCheck}from'lucide-react';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';

export default function BatchIepEvidenceReview({items=[],goals=[],update,onFileScores,onFileGoals,saving=false}){
 const approved=items.filter(x=>x.approved);
 const eligible=approved.filter(x=>(x.iep_candidates||[]).length>0);
 const selected=eligible.filter(x=>x.iep_selected_goal_id).length;
 const goalName=id=>{const g=goals.find(v=>v.id===id);return g?((g.goal_area||'Goal')+' — '+String(g.goal_text||'').slice(0,150)):'Goal'};
 return<div className='space-y-4'>
  <Card className='overflow-hidden border-emerald-100'>
   <div className='bg-emerald-950 p-6 text-white'><div className='text-[10px] font-black uppercase tracking-[.2em] text-emerald-300'>Potential IEP Evidence</div><h3 className='mt-1 text-2xl font-black'>{eligible.length?('CaseCue found '+eligible.length+' work sample'+(eligible.length===1?'':'s')+' relevant to active goals.'):'No strong goal matches found.'}</h3><p className='mt-2 text-sm text-emerald-100'>Grades are already teacher-approved. Nothing becomes progress evidence unless you choose the goal here.</p></div>
  </Card>

  {eligible.map(x=>{
   const i=items.findIndex(v=>v._key===x._key),top=(x.iep_candidates||[])[0];
   return<Card key={x._key} className='p-5'>
    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
     <div className='min-w-0 flex-1'><div className='text-[10px] font-black uppercase tracking-wider text-slate-500'>{x.detected_title||'Student work'}</div><div className='mt-1 text-lg font-black'>{x.score_earned}/{x.score_possible} · {x.percentage}%</div><div className='mt-1 text-sm text-slate-600'>{(x.skills||[]).join(' · ')}</div></div>
     <div className='rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800'>{top.confidence} match</div>
    </div>
    <div className='mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4'><div className='text-[10px] font-black uppercase tracking-wider text-emerald-800'>Suggested active goal</div><div className='mt-1 text-sm font-black'>{goalName(top.goal_id)}</div><div className='mt-2 text-xs text-slate-700'>{top.rationale}</div>{(top.skill_overlap||[]).length>0&&<div className='mt-2 text-xs font-semibold text-emerald-800'>Overlap: {top.skill_overlap.join(' · ')}</div>}<div className='mt-2 text-[11px] text-slate-500'>Evidence strength: {String(top.evidence_strength||'needs_review').replaceAll('_',' ')}</div></div>
    <div className='mt-4'>
     <select className='h-10 w-full rounded-lg border-2 border-emerald-200 bg-white px-3 text-sm font-semibold' value={x.iep_selected_goal_id||''} onChange={e=>update(i,{iep_selected_goal_id:e.target.value,suggested_goal_id:e.target.value,goal_match_confidence:e.target.value?'teacher_confirmed':'none',evidence_strength:e.target.value?(x.iep_candidates||[]).find(c=>c.goal_id===e.target.value)?.evidence_strength||'supporting':'needs_review',goal_alignment:e.target.value?(x.iep_candidates||[]).find(c=>c.goal_id===e.target.value)?.rationale||'':''})}>
      <option value=''>Do not add as IEP progress evidence</option>
      {(x.iep_candidates||[]).map(c=><option key={c.goal_id} value={c.goal_id}>{goalName(c.goal_id)}</option>)}
     </select>
    </div>
   </Card>
  })}

  <Card className='p-5'>
   <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'><div><div className='text-[10px] font-black uppercase tracking-[.18em] text-blue-700'>Final Filing</div><h3 className='text-xl font-black'>{approved.length} approved grade{approved.length===1?'':'s'} · {selected} selected for goal evidence</h3><p className='text-sm text-slate-500'>You can file every grade without IEP evidence, or file the selected work samples as progress evidence at the same time.</p></div><div className='flex flex-wrap gap-2'><Button disabled={saving} onClick={onFileScores} className='bg-slate-950 text-white'><ShieldCheck className='mr-1 h-4 w-4'/>File Grades Only</Button><Button disabled={saving||!selected} onClick={onFileGoals} className='bg-emerald-700 text-white'><Target className='mr-1 h-4 w-4'/>File + Selected Goal Evidence ({selected})</Button></div></div>
  </Card>
 </div>;
}
