import React,{useMemo,useState}from'react';
import{ArrowRight,CheckCircle2,Eye,UserCheck,Edit3,Loader2}from'lucide-react';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';

const isWriting=x=>/writing|narrative|opinion|argument|story|sentence|paragraph/i.test(String([x.subject,x.detected_title,...(x.skills||[])].join(' ')));
const hasScore=x=>Number(x.score_possible)>0&&Number.isFinite(Number(x.score_earned));
const needsIdentity=x=>!x.student_id;
const needsWritingApproval=x=>isWriting(x)&&(x.rubric_breakdown||[]).length>0&&!x.teacher_score_confirmed;
const needsScore=x=>(!hasScore(x)||['not_scored','low'].includes(String(x.scoring_confidence||'').toLowerCase()))&&!x.teacher_score_confirmed;

export default function BatchDecisionQueue({items=[],students=[],update,confirmStudent,openEvidence,onApproveGrades,approving=false,submissionMode=false}){
 const [cursor,setCursor]=useState(0);
 const sorted=[...students].sort((a,b)=>(String(a.last_name||'')+', '+String(a.first_name||'')).localeCompare(String(b.last_name||'')+', '+String(b.first_name||''),undefined,{sensitivity:'base'}));
 const decisions=useMemo(()=>{
  const out=[];
  items.forEach((x,i)=>{
   if(needsIdentity(x))out.push({type:'identity',i,x});
   if(needsWritingApproval(x))out.push({type:'writing',i,x});
   else if(needsScore(x))out.push({type:'score',i,x});
  });
  return out;
 },[items]);
 const totalArtifacts=items.length||1;
 const handled=Math.max(0,Math.round((1-decisions.length/Math.max(totalArtifacts,decisions.length||1))*100));
 const current=decisions[Math.min(cursor,Math.max(0,decisions.length-1))];
 const studentName=id=>{const s=students.find(v=>v.id===id);return s?(s.first_name+' '+s.last_name):''};
 const next=()=>setCursor(0);

 if(!decisions.length)return<Card className='overflow-hidden'>
  <div className='bg-emerald-950 p-6 text-white'><div className='text-[10px] font-black uppercase tracking-[.2em] text-emerald-300'>Batch Ready</div><h3 className='mt-1 text-2xl font-black'>No decisions left.</h3><p className='mt-2 text-sm text-emerald-100'>{submissionMode?'CaseCue graded what it could and you resolved the exceptions. Submit these proposed scores for authorized educator review.':'CaseCue graded what it could and you resolved the exceptions. Approve the grades, then CaseCue will check active IEP goals.'}</p></div>
  <div className='p-5'><Button disabled={approving} onClick={onApproveGrades} className='bg-emerald-700 text-white'>{approving?<Loader2 className='mr-2 h-4 w-4 animate-spin'/>:<CheckCircle2 className='mr-2 h-4 w-4'/>}{approving?(submissionMode?'Preparing submission…':'Checking IEP evidence…'):(submissionMode?'Continue to Teacher Review Submission':'Approve Grades & Check IEP Evidence')}<ArrowRight className='ml-2 h-4 w-4'/></Button></div>
 </Card>;

 return<div className='space-y-4'>
  <Card className='overflow-hidden border-blue-100'>
   <div className='bg-slate-950 p-5 text-white'>
    <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
     <div><div className='text-[10px] font-black uppercase tracking-[.2em] text-sky-300'>Decision Queue</div><h3 className='mt-1 text-2xl font-black'>CaseCue handled {handled}%.</h3><p className='mt-1 text-sm text-slate-300'>You have {decisions.length} decision{decisions.length===1?'':'s'} left. One question at a time.</p></div>
     <div className='min-w-[220px]'><div className='mb-1 flex justify-between text-xs font-bold'><span>Handled</span><span>{handled}%</span></div><div className='h-2 overflow-hidden rounded-full bg-white/15'><div className='h-full bg-sky-400' style={{width:handled+'%'}}/></div></div>
    </div>
   </div>
  </Card>

  {current&&<Card className='mx-auto max-w-3xl overflow-hidden'>
   <div className='border-b bg-slate-50 p-4 text-xs font-bold text-slate-500'>Decision {Math.min(cursor+1,decisions.length)} of {decisions.length} · {current.x.pages||''}</div>
   <div className='p-6'>
    {current.type==='identity'&&<>
     <div className='text-[10px] font-black uppercase tracking-wider text-amber-700'>Who is this?</div>
     <h3 className='mt-2 text-2xl font-black'>{current.x.probable_student_name?('Is this '+current.x.probable_student_name+'?'):'Choose the student'}</h3>
     <div className='mt-4 rounded-2xl border bg-slate-50 p-4'><div className='text-xs font-black uppercase text-slate-500'>Detected on work</div><div className='mt-1 text-lg font-bold'>{current.x.visible_name||current.x.detected_name||'Name unclear'}</div>{current.x.probable_student_name&&<><div className='mt-4 text-xs font-black uppercase text-slate-500'>Roster match</div><div className='mt-1 text-xl font-black'>{current.x.probable_student_name}</div><div className='text-sm text-amber-700'>{current.x.identity_match_score||0}% match</div></>}</div>
     <div className='mt-5 flex flex-wrap gap-2'>
      {current.x.probable_student_id&&<Button className='bg-amber-700 text-white' onClick={async()=>{await confirmStudent(current.i,current.x,current.x.probable_student_id);next();}}><UserCheck className='mr-1 h-4 w-4'/>Yes, {current.x.probable_student_name}</Button>}
      <select className='h-10 rounded-lg border bg-white px-3 text-sm font-semibold' defaultValue='' onChange={async e=>{if(e.target.value){await confirmStudent(current.i,current.x,e.target.value);next();}}}><option value=''>Choose another student…</option>{sorted.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select>
      <Button variant='outline' onClick={()=>openEvidence(current.x)}><Eye className='mr-1 h-4 w-4'/>View work</Button>
     </div>
    </>}

    {current.type==='writing'&&<>
     <div className='text-[10px] font-black uppercase tracking-wider text-violet-700'>Writing score needs approval</div>
     <h3 className='mt-2 text-2xl font-black'>Suggested: {current.x.score_earned}/{current.x.score_possible} · {current.x.percentage}%</h3>
     <div className='mt-4 space-y-2'>{(current.x.rubric_breakdown||[]).map((r,ri)=><div key={ri} className='grid gap-2 rounded-xl border bg-white p-3 sm:grid-cols-[1.2fr_1.8fr_.6fr]'><div><div className='text-xs font-black'>{r.criterion||('Criterion '+(ri+1))}</div><div className='mt-1 text-xs text-slate-500'>{r.note||''}</div></div><div className='text-xs text-slate-600'>{r.evidence||'Visible writing evidence was used for this suggestion.'}</div><div className='text-right font-black'>{r.earned}/{r.possible}</div></div>)}</div>
     <div className='mt-5 flex flex-wrap gap-2'><Button className='bg-violet-700 text-white' onClick={()=>{update(current.i,{teacher_score_confirmed:true,scoring_confidence:'teacher_confirmed',approved:false});next();}}><CheckCircle2 className='mr-1 h-4 w-4'/>Accept {current.x.score_earned}/{current.x.score_possible}</Button><Button variant='outline' onClick={()=>openEvidence(current.x)}><Eye className='mr-1 h-4 w-4'/>View work</Button></div>
     <div className='mt-5 rounded-xl border bg-slate-50 p-4'><div className='flex items-center gap-2 text-xs font-black uppercase text-slate-500'><Edit3 className='h-3.5 w-3.5'/>Edit final score</div><div className='mt-2 grid grid-cols-2 gap-2'><Input type='number' min='0' value={current.x.score_earned??0} onChange={e=>update(current.i,{score_earned:Number(e.target.value||0),approved:false})}/><Input type='number' min='0' value={current.x.score_possible??0} onChange={e=>update(current.i,{score_possible:Number(e.target.value||0),approved:false})}/></div><Button size='sm' className='mt-3' onClick={()=>{update(current.i,{teacher_score_confirmed:true,scoring_confidence:'teacher_confirmed',approved:false});next();}}>Use edited score</Button></div>
    </>}

    {current.type==='score'&&<>
     <div className='text-[10px] font-black uppercase tracking-wider text-rose-700'>Teacher decision needed</div>
     <h3 className='mt-2 text-2xl font-black'>CaseCue could not defend a final numeric score.</h3>
     <p className='mt-2 text-sm text-slate-600'>{(current.x.score_confidence_reasons||[]).join(' ')||current.x.scoring_basis||'Open the work and enter the score you want to use.'}</p>
     <div className='mt-5 rounded-xl border bg-slate-50 p-4'><div className='grid grid-cols-2 gap-2'><div><div className='text-xs font-bold text-slate-500'>Earned</div><Input type='number' min='0' value={current.x.score_earned??0} onChange={e=>update(current.i,{score_earned:Number(e.target.value||0),approved:false})}/></div><div><div className='text-xs font-bold text-slate-500'>Possible</div><Input type='number' min='0' value={current.x.score_possible??0} onChange={e=>update(current.i,{score_possible:Number(e.target.value||0),approved:false})}/></div></div></div>
     <div className='mt-5 flex flex-wrap gap-2'><Button onClick={()=>{if(Number(current.x.score_possible)>0){update(current.i,{teacher_score_confirmed:true,scoring_confidence:'teacher_confirmed',approved:false});next();}}}><CheckCircle2 className='mr-1 h-4 w-4'/>Use this score</Button><Button variant='outline' onClick={()=>openEvidence(current.x)}><Eye className='mr-1 h-4 w-4'/>View work</Button></div>
    </>}
   </div>
  </Card>}
 </div>;
}
