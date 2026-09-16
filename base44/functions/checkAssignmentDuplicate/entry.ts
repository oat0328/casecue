import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const norm = (v='') => String(v).toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const tokens = (v='') => new Set(norm(v).split(' ').filter(x=>x.length>2));
const jaccard = (a,b) => { const A=tokens(a), B=tokens(b); if(!A.size||!B.size) return 0; const i=[...A].filter(x=>B.has(x)).length; return i/(A.size+B.size-i); };
const signature = (analysis={}) => norm([analysis.detected_title, ...(analysis.skills||[]), ...(analysis.questions||[])].join(' ')).slice(0,4000);

export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me();
    if(!user) return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json(); const analysis=body.analysis||{}; const sig=signature(analysis);
    const studentIds=Array.isArray(body.student_ids)?body.student_ids:[];
    const uses=await base44.entities.AssignmentUse.list('-used_date',300);
    const candidates=(uses||[]).map(u=>{
      const titleScore=jaccard(analysis.detected_title,u.assignment_title);
      const contentScore=jaccard(sig,u.source_signature||u.question_signature||[u.assignment_title,...(u.skills||[])].join(' '));
      const sameStudent=studentIds.length>0 && (u.student_ids||[]).some(id=>studentIds.includes(id));
      const score=Math.min(1,(titleScore*.35)+(contentScore*.55)+(sameStudent?.10:0));
      return {id:u.id,assignment_title:u.assignment_title,used_date:u.used_date,purpose:u.purpose,student_ids:u.student_ids||[],goal_ids:u.goal_ids||[],correct:u.correct,total:u.total,percentage:u.percentage,similarity:Math.round(score*100),same_student:sameStudent};
    }).filter(x=>x.similarity>=60).sort((a,b)=>b.similarity-a.similarity).slice(0,5);
    return Response.json({
      source_signature:sig,
      duplicate_status:candidates.some(x=>x.similarity>=85)?'likely_duplicate':candidates.length?'possible_duplicate':'no_match',
      candidates,
      guidance:candidates.length?'Teacher review required. A repeated assignment may be intentional practice/reteach or a progress-monitoring retest. Do not treat a repeated score as independent evidence without noting reuse.':'No similar prior assignment use was found in available CaseCue history.'
    });
  } catch(error){ return Response.json({error:error.message},{status:500}); }
}
