import React,{useMemo}from'react';
import{Eye,ArrowRight,UserCheck,Layers3,AlertTriangle}from'lucide-react';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';

export default function BatchStagingBoard({items=[],students=[],pages=0,update,confirmStudent,openEvidence,onContinue,busy=false}){
 const sorted=[...students].sort((a,b)=>(String(a.last_name||'')+', '+String(a.first_name||'')).localeCompare(String(b.last_name||'')+', '+String(b.first_name||''),undefined,{sensitivity:'base'}));
 const studentName=id=>{const s=students.find(v=>v.id===id);return s?(s.first_name+' '+s.last_name):''};
 const groups=useMemo(()=>{
  const m=new Map();
  for(const x of items){const key=x.student_id||x.probable_student_id||x.visible_name||x.detected_name||'unmatched';if(!m.has(key))m.set(key,[]);m.get(key).push(x);}
  return[...m.entries()];
 },[items]);
 const identified=new Set(items.map(x=>x.student_id||x.probable_student_id).filter(Boolean)).size;
 const uncertain=items.filter(x=>!x.student_id).length;
 return<div className='space-y-4'>
  <Card className='overflow-hidden border-blue-100'>
   <div className='bg-slate-950 p-5 text-white'>
    <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
     <div><div className='text-[10px] font-black uppercase tracking-[.2em] text-sky-300'>Packet Check</div><h3 className='mt-1 text-2xl font-black'>We separated your packet.</h3><p className='mt-1 text-sm text-slate-300'>Check student routing and page grouping before CaseCue spends time grading.</p></div>
     <div className='grid grid-cols-3 gap-2 text-center text-xs'>
      <div className='rounded-xl border border-white/10 bg-white/5 p-3'><div className='text-xl font-black'>{pages||'—'}</div><div className='text-slate-300'>pages</div></div>
      <div className='rounded-xl border border-white/10 bg-white/5 p-3'><div className='text-xl font-black'>{identified}</div><div className='text-slate-300'>students</div></div>
      <div className='rounded-xl border border-white/10 bg-white/5 p-3'><div className='text-xl font-black'>{items.length}</div><div className='text-slate-300'>work samples</div></div>
     </div>
    </div>
   </div>
   {uncertain>0&&<div className='border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900'><AlertTriangle className='mr-2 inline h-4 w-4'/>{uncertain} work sample{uncertain===1?'':'s'} still need student confirmation. You can confirm them here or in the decision queue.</div>}
  </Card>

  <div className='space-y-4'>
   {groups.map(([key,rows])=>{
    const lead=rows[0],label=lead.student_id?studentName(lead.student_id):(lead.probable_student_name?('Probable: '+lead.probable_student_name):(lead.visible_name?('Detected: '+lead.visible_name):'Student needs match'));
    return<Card key={key} className='p-5'>
     <div className='flex flex-wrap items-start justify-between gap-3'>
      <div><div className='text-[10px] font-black uppercase tracking-wider text-slate-500'>Student group</div><div className='mt-1 text-lg font-black'>{label}</div>{lead.identity_match_score>0&&<div className='mt-1 text-xs text-amber-700'>{lead.identity_match_score}% roster match</div>}</div>
      {!lead.student_id&&lead.probable_student_id&&<Button size='sm' onClick={()=>rows.forEach(x=>confirmStudent(items.findIndex(v=>v._key===x._key),x,lead.probable_student_id))} className='bg-amber-700 text-white'><UserCheck className='mr-1 h-4 w-4'/>Confirm {lead.probable_student_name}</Button>}
     </div>
     <div className='mt-3'>
      <select className='h-10 w-full max-w-xl rounded-lg border bg-white px-3 text-sm font-semibold' value={lead.student_id||''} onChange={e=>{const id=e.target.value;if(id)rows.forEach(x=>confirmStudent(items.findIndex(v=>v._key===x._key),x,id));}}>
       <option value=''>Choose student for this group…</option>{sorted.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
      </select>
     </div>
     <div className='mt-4 grid gap-3'>
      {rows.map(x=>{const i=items.findIndex(v=>v._key===x._key);return<div key={x._key} className='rounded-2xl border bg-slate-50/50 p-4'>
       <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
        <div className='grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-800'><Layers3 className='h-4 w-4'/></div>
        <div className='min-w-0 flex-1'><Input value={x.detected_title||''} onChange={e=>update(i,{detected_title:e.target.value,approved:false})} className='font-bold'/><div className='mt-1 text-xs text-blue-700'>{x.pages||((x.source_pages||[]).length?('Pages '+x.source_pages.join(', ')):'')}</div><div className='mt-1 flex flex-wrap gap-1'>{(x.skills||[]).map(s=><span key={s} className='rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600'>{s}</span>)}</div></div>
        <div className='text-right text-xs'><div className='font-black uppercase text-slate-500'>Grouping</div><div className={x.grouping_confidence==='high'?'font-bold text-emerald-700':'font-bold text-amber-700'}>{x.grouping_confidence||'review'}</div></div>
        <Button size='sm' variant='outline' onClick={()=>openEvidence(x)}><Eye className='mr-1 h-3.5 w-3.5'/>Open pages</Button>
       </div>
       {x.grouping_reason&&<div className='mt-2 text-xs text-slate-500'>{x.grouping_reason}</div>}
      </div>})}
     </div>
    </Card>
   })}
  </div>

  <Card className='p-5'>
   <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'><div><div className='font-black'>Everything grouped correctly?</div><div className='text-sm text-slate-500'>Continue when the work samples look right. CaseCue will grade each extracted artifact independently.</div></div><Button disabled={!items.length||busy} onClick={onContinue} className='bg-blue-700 text-white'>{busy?'Starting grading…':'Continue to Grading'}<ArrowRight className='ml-2 h-4 w-4'/></Button></div>
  </Card>
 </div>;
}
