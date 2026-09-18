import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';

const SCHEMA={
 type:'object',
 properties:{
  items:{type:'array',items:{type:'object',properties:{
   visible_name:{type:'string'},
   identity_basis:{type:'string'},
   source_pages:{type:'array',items:{type:'number'}},
   detected_title:{type:'string'},
   evidence_type:{type:'string'},
   subject:{type:'string'},
   skills:{type:'array',items:{type:'string'}},
   grouping_confidence:{type:'string',enum:['high','medium','low']},
   grouping_reason:{type:'string'},
   cautions:{type:'array',items:{type:'string'}}
  },required:['visible_name','identity_basis','source_pages','detected_title','evidence_type','subject','skills','grouping_confidence','grouping_reason','cautions']}}
 },
 required:['items']
};

const norm=(v='')=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const lev=(a='',b='')=>{const x=norm(a),y=norm(b),d=Array.from({length:x.length+1},(_,i)=>[i]);for(let j=1;j<=y.length;j++)d[0][j]=j;for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)d[i][j]=x[i-1]===y[j-1]?d[i-1][j-1]:1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);return d[x.length][y.length];};
const sim=(a='',b='')=>{const x=norm(a),y=norm(b);if(!x||!y)return 0;if(x===y)return 1;if(x.includes(y)||y.includes(x))return .96;const m=Math.max(x.length,y.length);return m?Math.max(0,1-lev(x,y)/m):0;};
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\bsvg\b/gi,' ').replace(/\s+/g,' ').trim();

function rosterMatch(visible,students){
 const n=norm(visible);if(!n)return null;
 const tokens=n.split(' ').filter(Boolean);
 const ranked=students.map(s=>{
  const first=norm(s.first_name||''),last=norm(s.last_name||''),full=norm((s.first_name||'')+' '+(s.last_name||''));
  let score=sim(n,full),reason='';
  if(tokens.length===1&&first){
   const firstScore=sim(tokens[0],first);
   const sameFirst=students.filter(v=>sim(tokens[0],norm(v.first_name||''))>=.88).length;
   if(firstScore>=.92&&sameFirst===1){score=Math.max(score,.97);reason='Visible first name uniquely matches one student on the roster.';}
   else if(firstScore>=.85){score=Math.max(score,.84);reason='Visible first name is similar to a roster student but needs confirmation.';}
  }
  if(tokens.length>=2&&first&&last){
   const f=sim(tokens[0],first),l=sim(tokens[tokens.length-1],last);
   if(f>=.88&&l>=.82){score=Math.max(score,.93+(Math.min(f,l)-.82)*.3);reason='Visible first and last name closely match the roster.';}
  }
  return{s,score:Math.min(1,score),reason};
 }).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1];
 if(!best||best.score<.72)return null;
 const margin=best.score-(second?.score||0);
 return{student:best.s,score:best.score,margin,reason:best.reason||'Closest roster name match.'};
}

export default async function(req){
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const organizationId=String(user.organization_id||user.data?.organization_id||'');
  if(!organizationId)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});
  const body=await req.json().catch(()=>({}));
  const fileUri=String(body.file_uri||'');
  if(!fileUri)return Response.json({error:'A PDF or scanned packet is required.'},{status:400});
  const expectedTitle=clean(body.expected_assignment_title||'');
  const expectedSubject=clean(body.expected_subject||'');
  const mode=body.mode==='guided'?'guided':'mixed';
  const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:900});
  const students=await base44.asServiceRole.entities.Student.filter({organization_id:organizationId},'-updated_date',500);
  const roster=students.map(s=>({id:s.id,name:clean((s.first_name||'')+' '+(s.last_name||'')),first_name:s.first_name||'',last_name:s.last_name||'',grade:s.grade||''}));
  const prompt=[
   CASECUE_SYSTEM_PROMPT,
   '',
   'You are the CaseCue Packet Stager. Your job is ONLY to separate a scanned classroom packet into physical work samples and read basic routing information.',
   'Do NOT grade answers. Do NOT calculate scores. Do NOT inspect or match IEP goals. Do NOT create progress-monitoring conclusions.',
   '',
   'AUTHORIZED ROSTER:',
   JSON.stringify(roster),
   '',
   'MODE: '+mode,
   'EXPECTED ASSIGNMENT TITLE: '+(expectedTitle||'not provided'),
   'EXPECTED SUBJECT: '+(expectedSubject||'not provided'),
   '',
   'RULES:',
   '1. Return ONE item for EACH distinct physical student work sample. Combine pages only when they are clearly consecutive pages of the SAME assignment for the SAME student.',
   '2. source_pages are 1-based page numbers inside this submitted chunk.',
   '3. Transcribe the visible student name exactly as it appears. If only a first name is visible, return only that first name. Never invent a last name.',
   '4. identity_basis should briefly say where the name was seen, such as "Name line: Maryah".',
   '5. In guided mode, use the teacher-provided expected assignment title/subject unless the pages clearly show they are unrelated.',
   '6. In mixed mode, identify the visible assignment title, evidence type, subject, and observable skills without grading it.',
   '7. grouping_confidence reflects only confidence that the selected pages belong together as one work sample.',
   '8. Flag mixed students, uncertain page boundaries, blank separator pages, cover sheets, or illegible names in cautions.',
   '9. Do not use handwriting style, performance, disability, prior work, or IEP data to identify a student.',
   '',
   'Return JSON matching the schema.'
  ].join('\n');
  const result=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,file_urls:[signed.signed_url],response_json_schema:SCHEMA,model:'automatic'});
  const data=typeof result==='object'?result:JSON.parse(result);
  const items=(data.items||[]).map((x,i)=>{
   const visible=clean(x.visible_name||'');
   const match=rosterMatch(visible,students);
   const score=match?Math.round(match.score*100):0;
   const provisional=!!(match&&score>=98&&match.margin>=.12&&norm(visible).split(' ').length>=2);
   return{
    ...x,
    visible_name:visible,
    detected_name:visible,
    detected_title:expectedTitle||clean(x.detected_title||'Student work'),
    subject:expectedSubject||clean(x.subject||''),
    skills:(x.skills||[]).map(clean).filter(Boolean),
    probable_student_id:match?.student?.id||'',
    probable_student_name:match?clean((match.student.first_name||'')+' '+(match.student.last_name||'')):'',
    identity_match_score:score,
    identity_reasons:match?[match.reason]:[],
    student_id:provisional?match.student.id:'',
    student_name:visible,
    student_match_confidence:provisional?'high':score>=92?'medium':score>=75?'low':'unmatched',
    identity_status:provisional?'provisional':match?'probable':'unmatched',
    score_earned:0,
    score_possible:0,
    percentage:0,
    scoring_confidence:'not_scored',
    scoring_basis:'',
    scoring_breakdown:[],
    question_breakdown:[],
    rubric_breakdown:[],
    suggested_goal_id:'',
    goal_match_confidence:'none',
    goal_alignment:'',
    goal_skill_overlap:[],
    goal_aligned_items:[],
    evidence_strength:'needs_review',
    _stage_index:i
   };
  });
  return Response.json({items});
 }catch(error){
  console.error('stageBatchStudentWork failed:',error);
  return Response.json({error:error.message||'Unable to stage the packet.'},{status:500});
 }
}
