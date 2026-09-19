import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import JSZip from 'npm:jszip@3.10.1';

const PULL={
  type:'object',
  properties:{
    name:{type:'string'},student_id:{type:'string'},match_type:{type:'string'},confidence:{type:'string'},
    probable_student_id:{type:'string'},probable_student_name:{type:'string'},source_subject:{type:'string'},source_teacher:{type:'string'},source_room:{type:'string'},source_period:{type:'string'},
    class_start_time:{type:'string'},class_end_time:{type:'string'},pull_start_time:{type:'string'},pull_end_time:{type:'string'},
    pull_rule:{type:'string'},source_confidence:{type:'string'}
  },
  required:['name','student_id','match_type','confidence']
};

const SCHEMA={
  type:'object',
  properties:{
    summary:{type:'string'},
    groups:{type:'array',items:{type:'object',properties:{
      group_name:{type:'string'},delivery:{type:'string',enum:['pull-out','push-in','consultation','class','session','support','other']},day:{type:'string'},
      start_time:{type:'string'},end_time:{type:'string'},service_minutes:{type:'number'},teacher_classroom:{type:'string'},
      notes:{type:'string'},period:{type:'string'},recurrence_note:{type:'string'},week_pattern:{type:'string'},
      cycle_day:{type:'string'},goal_focus:{type:'array',items:{type:'string'}},students:{type:'array',items:PULL}
    },required:['group_name','delivery','day','start_time','end_time','students']}},
    conflicts:{type:'array',items:{type:'object',properties:{description:{type:'string'},severity:{type:'string'}},required:['description']}},
    unmatched_names:{type:'array',items:{type:'string'}},
    non_instructional_blocks:{type:'array',items:{type:'object',properties:{
      label:{type:'string'},day:{type:'string'},start_time:{type:'string'},end_time:{type:'string'},notes:{type:'string'}
    },required:['label','day','start_time','end_time']}},
    extraction_notes:{type:'array',items:{type:'string'}}
  },
  required:['groups','conflicts','extraction_notes']
};

const norm=(v='')=>String(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const tokens=(v='')=>String(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
const initials=(v='')=>String(v).split(/[\s\-']+/).filter(Boolean).map(x=>norm(x)[0]||'').join('');
const rosterAliases=s=>{
  const first=norm(s.first_name),last=norm(s.last_name),li=initials(s.last_name),fi=first[0]||'';
  return new Set([`${first}${last}`,`${first}${last[0]||''}`,`${fi}${last}`,`${fi}${li}`,`${first}${li}`,`${fi}${last[0]||''}`].filter(Boolean));
};
const deterministicMatch=(label,students)=>{
  const key=norm(label);if(!key)return null;
  const hits=students.filter(s=>rosterAliases(s).has(key));
  return hits.length===1?hits[0]:null;
};

const decodeXml=s=>String(s||'')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&apos;/g,"'");

const stripTags=s=>decodeXml(String(s||'').replace(/<[^>]+>/g,''));

const paragraphText=xml=>{
  const paras=String(xml||'').match(/<w:p\b[\s\S]*?<\/w:p>/g)||[];
  const out=[];
  for(const p of paras){
    const pieces=[...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>decodeXml(m[1]));
    const text=pieces.join('').replace(/\s+/g,' ').trim();
    if(text)out.push(text);
  }
  if(out.length)return out.join('\n');
  const pieces=[...String(xml||'').matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>decodeXml(m[1]));
  return pieces.join(' ').replace(/\s+/g,' ').trim();
};

const parseDocxRows=async signedUrl=>{
  const res=await fetch(signedUrl);
  if(!res.ok)throw new Error('CaseCue could not open the Word schedule.');
  const zip=await JSZip.loadAsync(new Uint8Array(await res.arrayBuffer()));
  const entry=zip.file('word/document.xml');
  if(!entry)throw new Error('This Word file does not contain a readable document table.');
  const xml=await entry.async('string');
  const table=(xml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/)||[])[0];
  if(!table)throw new Error('No schedule table was found in the Word document.');
  const rows=[];
  for(const tr of table.match(/<w:tr\b[\s\S]*?<\/w:tr>/g)||[]){
    const cells=(tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/g)||[]).map(paragraphText);
    rows.push(cells);
  }
  return rows;
};

const to24=t=>{
  const m=String(t||'').match(/(\d{1,2}):(\d{2})/);if(!m)return'';
  let h=Number(m[1]);const mm=m[2];
  if(h>=1&&h<=6)h+=12;
  return String(h).padStart(2,'0')+':'+mm;
};

const minutesBetween=(start,end)=>{
  const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
  if(!Number.isFinite(sh)||!Number.isFinite(eh))return 0;
  return Math.max(0,(eh*60+em)-(sh*60+sm));
};

const studentDisplay=s=>{
  const parts=[s.first_name,s.middle_name,s.preferred_name,s.nickname,s.last_name,s.name].filter(Boolean);
  return parts.join(' ').replace(/\s+/g,' ').trim();
};

const flexibleMatch=(label,students)=>{
  const direct=deterministicMatch(label,students);
  if(direct)return{student:direct,confidence:'high',match_type:'exact'};
  const vt=tokens(label);if(!vt.length)return null;
  const ranked=students.map(s=>{
    const first=tokens(s.first_name||'')[0]||'';
    const last=tokens(s.last_name||'').slice(-1)[0]||'';
    const full=tokens(studentDisplay(s));
    let score=0;
    if(vt.length>=2){
      const vf=vt[0],vl=vt[vt.length-1];
      if(first&&last&&vf===first&&vl===last)score=1;
      else if(first&&last&&vf===first&&vl.length===1&&last.startsWith(vl))score=.98;
      else if(last&&vl===last&&(first.startsWith(vf)||vf.startsWith(first)))score=.95;
      else if(last&&vl===last&&full.includes(vf))score=.94;
      else if(vt.every(x=>full.includes(x)))score=.93;
    }else{
      const only=vt[0];
      if(first===only)score=.94;
      else if(first&&(first.startsWith(only)||only.startsWith(first)))score=.88;
      else if(full.includes(only))score=.86;
    }
    return{s,score};
  }).sort((a,b)=>b.score-a.score);
  const best=ranked[0],second=ranked[1];
  if(!best||best.score<.84)return null;
  if(second&&best.score-second.score<.06)return null;
  return{student:best.s,confidence:best.score>=.95?'high':'medium',match_type:'probable'};
};

const makeStudent=(name,students)=>{
  const hit=flexibleMatch(name,students);
  if(!hit)return{name:String(name||'').trim(),student_id:'',probable_student_id:'',probable_student_name:'',match_type:'unmatched',confidence:'none',source_subject:'',source_teacher:'',source_room:'',source_period:'',class_start_time:'',class_end_time:'',pull_start_time:'',pull_end_time:'',pull_rule:'',source_confidence:''};
  const rosterName=`${hit.student.first_name||''} ${hit.student.last_name||''}`.trim();
  if(hit.match_type==='probable')return{name:String(name||'').trim(),student_id:'',probable_student_id:hit.student.id,probable_student_name:rosterName,match_type:'probable',confidence:hit.confidence,source_subject:'',source_teacher:'',source_room:'',source_period:'',class_start_time:'',class_end_time:'',pull_start_time:'',pull_end_time:'',pull_rule:'',source_confidence:''};
  return{name:rosterName,student_id:hit.student.id,probable_student_id:'',probable_student_name:'',match_type:'exact',confidence:'high',source_subject:'',source_teacher:'',source_room:'',source_period:'',class_start_time:'',class_end_time:'',pull_start_time:'',pull_end_time:'',pull_rule:'',source_confidence:''};
};

const parseCellGroups=(text,{day,period,start_time,end_time,students})=>{
  const groups=[],blocks=[],unmatched=[];
  const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  for(const line of lines){
    if(/^prep\b/i.test(line)){
      blocks.push({label:'PREP',day,start_time,end_time,notes:'Imported directly from Word schedule table.'});
      continue;
    }
    const m=line.match(/^([A-Za-z][A-Za-z /&-]{0,30})\s*:\s*(.*)$/);
    if(!m)continue;
    const subject=m[1].trim();
    const names=m[2].split(',').map(x=>x.trim()).filter(Boolean);
    if(!names.length)continue;
    const rosterStudents=names.map(name=>{
      const st=makeStudent(name,students);
      if(!st.student_id)unmatched.push(name);
      return st;
    });
    groups.push({
      group_name:`${subject} · ${period}`,
      delivery:'pull-out',
      day,
      start_time,
      end_time,
      service_minutes:minutesBetween(start_time,end_time),
      teacher_classroom:'',
      notes:'Imported deterministically from Word schedule table.',
      period,
      recurrence_note:'',
      week_pattern:'every_week',
      cycle_day:'',
      goal_focus:[subject],
      students:rosterStudents
    });
  }
  return{groups,blocks,unmatched};
};

const parseDocxSchedule=async(signedUrl,students)=>{
  const rows=await parseDocxRows(signedUrl);
  if(rows.length<2||rows[0].length<6)throw new Error('The Word file does not look like a Monday-Friday schedule table.');
  const headers=rows[0].map(x=>String(x||'').trim());
  const days=headers.slice(1,6);
  const groups=[],non_instructional_blocks=[],unmatched=[];
  for(const row of rows.slice(1)){
    const first=String(row[0]||'');
    const period=(first.match(/\b(\d+(?:st|nd|rd|th)\s+period)\b/i)||[])[1]||'';
    const tm=first.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if(!period||!tm)continue;
    const start_time=to24(tm[1]),end_time=to24(tm[2]);
    for(let i=0;i<5;i++){
      const day=days[i]||['Monday','Tuesday','Wednesday','Thursday','Friday'][i];
      const parsed=parseCellGroups(row[i+1]||'',{day,period,start_time,end_time,students});
      groups.push(...parsed.groups);non_instructional_blocks.push(...parsed.blocks);unmatched.push(...parsed.unmatched);
    }
  }
  return{
    summary:`Imported ${groups.length} instructional groups from a structured Word schedule table.`,
    groups,
    conflicts:[],
    unmatched_names:[...new Set(unmatched)],
    non_instructional_blocks,
    extraction_notes:[
      'Parsed directly from the DOCX table structure; weekday columns and period rows were preserved without visual reconstruction.',
      'Student names were matched only against the active CaseCue roster; unresolved names remain unmatched for educator review.',
      'IEP goals were not required to reconstruct the uploaded schedule.'
    ]
  };
};

Deno.serve(async(req)=>{
  try{
    const base44=createClientFromRequest(req);
    const user=await base44.auth.me();
    if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json();
    const workspace=String(body.workspace||'sped');
    const uris=(body.file_uris||[]).filter(Boolean);
    const names=(body.file_names||[]).map(String);
    if(!uris.length)return Response.json({error:'Upload at least one schedule file.'},{status:400});

    const signedFiles=[];
    for(let i=0;i<Math.min(uris.length,20);i++){
      const s=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:String(uris[i]),expires_in:600});
      if(s?.signed_url)signedFiles.push({url:s.signed_url,name:names[i]||''});
    }
    if(!signedFiles.length)return Response.json({error:'The schedule uploaded, but CaseCue could not open the private file for analysis. Please retry the upload.'},{status:422});

    let students=[];
    if(workspace==='para'){
      const access=await base44.entities.ParaStudentAccess.list('-updated_at',500);
      students=(access||[]).filter(s=>s.active!==false).map(s=>({...s,id:s.student_id}));
    }else{
      students=(await base44.entities.Student.list('-updated_date',300)).filter(s=>s.roster_status!=='archived'&&s.status!=='exited');
    }

    const docx=workspace!=='para'&&signedFiles.find(f=>/\.docx$/i.test(f.name));
    if(docx){
      const parsed=await parseDocxSchedule(docx.url,students);
      if(parsed.groups.length===0)return Response.json({error:'Schedule Parsing Needs Review: CaseCue found the Word table but no instructional groups were extracted.',...parsed},{status:422});
      return Response.json(parsed);
    }

    const goals=workspace==='sped'?await base44.entities.Goal.list('-created_date',1000):[];
    const goalsBy={};for(const g of goals||[]){(goalsBy[g.student_id]??=[]).push(g.goal_area||g.description||'IEP goal')}
    const roster=students.map(s=>workspace==='para'
      ?`- ${s.first_name} ${s.last_name} | id:${s.id} | grade:${s.grade||'?'} | approved supports:${(s.approved_supports||[]).join(', ')||'none listed'}`
      :`- ${s.first_name} ${s.last_name} | id:${s.id} | aliases:${[`${s.first_name} ${String(s.last_name||'')[0]||''}`,`${String(s.first_name||'')[0]||''}${initials(s.last_name)}`].join(', ')} | grade:${s.grade||'?'} | weekly minutes:${s.service_minutes??'unknown'} | goal areas:${(goalsBy[s.id]||[]).join(', ')||'none recorded'} | services:${(s.services||[]).join(', ')||'none recorded'}`).join('\n');
    const rules=`Pull timing rule: ${body.pull_rule||'teacher choice'}; session length: ${body.session_minutes||30} minutes; max group size: ${body.max_group_size||4}; avoid: ${body.avoid||'none specified'}; preferred days: ${body.days||'Monday-Friday'}; delivery: ${body.delivery||'pull-out or push-in'}; additional request: ${body.pull_preferences||'none'}.`;

    const prompt=workspace==='para'?`You are CaseCue's PARAPROFESSIONAL schedule IMPORTER. Analyze ALL uploaded files together and preserve what the documents actually say. Do not redesign the schedule and do not require an IEP goal to import a schedule.

ASSIGNED PARA STUDENTS:
${roster||'- No students are currently assigned to this Para account.'}

UPLOAD MAY BE ONE OF THESE:
A) the para's own weekly support schedule,
B) an individual student's daily class schedule,
C) a bell schedule or a combination of files.

CRITICAL PARA IMPORT RULES:
- If the file is an INDIVIDUAL STUDENT DAILY SCHEDULE, that is valid Para input. Import each visible class period as class context instead of rejecting it for not being a SPED group grid.
- If the document explicitly labels the table "Daily Schedule" or otherwise clearly indicates the same class schedule repeats each school day, create the visible timed class blocks for Monday-Friday. Use delivery='class'. Preserve subject, period/block, teacher, room, start time and end time exactly.
- Attach the detected student name to each imported class block. Match ONLY against ASSIGNED PARA STUDENTS above. If the student is not assigned or cannot be matched uniquely, leave student_id blank and match_type='unmatched'; never guess.
- Lunch/recess/PREP/unavailable time goes in non_instructional_blocks, not instructional groups.
- A service table that gives frequency/minutes but NO day/time is useful context but is NOT a fixed schedule block. Put those facts in extraction_notes and do not invent a weekday or start time.
- If a service or support block has an explicit day/time, import it with delivery='support', 'push-in', 'pull-out', or 'consultation' as the source supports.
- If this is the para's own support schedule, preserve each real support block exactly and attach only students named in the source.
- Do not invent students, accommodations, service minutes, rooms, teachers, disability information, or assignments.
- Return groups=[] only when the document truly has no usable timed schedule blocks. An individual student's class timetable counts as usable schedule content.
- extraction_notes must state what kind of schedule was detected, any unmatched student name, and any service/frequency information that could not be placed on a specific day/time.
- Return JSON exactly matching the schema.`:`You are CaseCue's special education schedule IMPORTER and planner. Analyze ALL uploaded files together. A file may already BE the teacher's completed weekly SPED schedule. If so, PRESERVE it instead of redesigning it. PDFs may be visual calendar grids where raw text extraction is out of reading order; use the visual/table layout to preserve weekday columns and period rows.

ACTIVE CASELOAD:
${roster}

TEACHER RULES:
${rules}

CRITICAL IMPORT MODE:
- When a weekly SPED/resource schedule is present, each visible weekday/time/service block is the source of truth. Import those blocks exactly. Do NOT apply the generic pull timing rule to replace times already printed on the schedule.
- Recognize service labels such as R=Reading, W=Writing, M=Math, and SEL when the document uses them. Keep unknown local abbreviations in notes; do not invent their meaning.
- Names may be abbreviated. Reconcile ONLY against the ACTIVE CASELOAD above. If more than one roster student could match, set student_id='' and match_type='unmatched'. NEVER guess.
- Preserve starred/check-in notes, PREP, meetings, homebound, lunch/recess, and other non-instructional blocks when visible.

Rules:
1. Separate bell schedule facts, completed SPED service blocks, and Gen Ed schedules. Never treat Gen Ed as SPED service.
2. If a completed SPED schedule exists, preserve its groups/days/times/student service labels before attempting optimization.
3. If no completed SPED schedule exists, then propose groups by compatible IEP goal areas and availability using the teacher rules.
4. Respect weekday COLUMN POSITION in visual calendar grids.
5. Use only active roster students and roster IDs supplied above. Unknown/ambiguous names remain unmatched.
6. One output group per actual weekday/time/service block. A single weekday/period cell may contain MULTIPLE subject-labeled instructional groups. Emit each as a separate group.
7. Non-instructional teacher blocks go in non_instructional_blocks.
8. Never invent IEP goals, service minutes, class periods, teachers, rooms, subjects, student identities, or schedules.
9. extraction_notes must explain unreadable layout, ambiguous names, or missing source class.
10. If the document visibly contains substantial schedule content but you cannot confidently reconstruct it, return groups=[] rather than inventing a partial schedule.
11. Return JSON exactly matching the schema.`;

    const result=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,file_urls:signedFiles.map(f=>f.url),response_json_schema:SCHEMA});
    if(!result||!Array.isArray(result.groups)||result.groups.length===0)return Response.json({error:workspace==='para'?'Schedule Parsing Needs Review: CaseCue opened the file but could not find any reliable timed class/support blocks. Individual student schedules are supported; nothing was saved.':'Schedule Parsing Needs Review: CaseCue opened the upload but could not reliably reconstruct any instructional groups from the weekday/time grid. Your original file is safe. Try a flattened/print-to-PDF copy or upload the bell schedule and student schedule separately.',groups:[],conflicts:[],non_instructional_blocks:result?.non_instructional_blocks||[],extraction_notes:result?.extraction_notes||['No timed schedule blocks were confidently extracted.']},{status:422});

    for(const g of result.groups){
      for(const st of g.students||[]){
        const supplied=students.find(s=>s.id===st.student_id);
        if(supplied){st.name=`${supplied.first_name} ${supplied.last_name}`;st.match_type='exact';st.confidence='high';continue}
        const hit=deterministicMatch(st.name,students);
        if(hit){st.student_id=hit.id;st.name=`${hit.first_name} ${hit.last_name}`;st.match_type='exact';st.confidence='high'}
        else{st.student_id='';st.match_type='unmatched';st.confidence='none'}
      }
    }
    return Response.json(result);
  }catch(e){
    console.error('schedulePlanner',e);
    const raw=String(e?.message||'');
    const fileRead=/pdf|parse|invalid object|file access|document could not be read|failed to read|word file|document table/i.test(raw);
    return Response.json({error:fileRead?'CaseCue could not read this schedule file normally. Your original upload is safe. Try a flattened/print-to-PDF copy, a Word DOCX copy, a screenshot/image export, or upload the bell schedule and student schedule separately.':'CaseCue could not finish building the schedule. Nothing was saved. Please retry the upload.'},{status:fileRead?422:500});
  }
});
