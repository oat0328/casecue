import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';

const between=(d,a,b)=>{const x=String(d||'').slice(0,10);return !!x&&x>=a&&x<=b};
const pctRow=r=>Number(r?.score_possible)>0?Math.round((Number(r.score_earned||0)/Number(r.score_possible))*1000)/10:(Number.isFinite(Number(r?.current_grade_percent))?Number(r.current_grade_percent):null);
const avg=xs=>{const a=xs.map(Number).filter(Number.isFinite);return a.length?Math.round((a.reduce((n,x)=>n+x,0)/a.length)*10)/10:null};
const mins=s=>Number(s?.delivered_minutes??s?.duration_minutes??0)||0;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));
  const studentId=String(body.student_id||''),workspace=String(body.workspace||'sped');
  const weekStart=String(body.week_start||''),weekEnd=String(body.week_end||'');
  if(!studentId||!weekStart||!weekEnd)return Response.json({error:'Student and week dates are required.'},{status:400});
  if(!['para','sped','gen_ed'].includes(workspace))return Response.json({error:'Weekly family updates are available for Para, SPED, and Gen Ed.'},{status:400});
  if(weekEnd<weekStart)return Response.json({error:'Week end must be on or after week start.'},{status:400});
  const org=String(user.organization_id||user.data?.organization_id||'');
  if(!org)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});

  const student=await base44.entities.Student.get(studentId);
  if(!student||String(student.organization_id||'')!==org)return Response.json({error:'Student not found in your authorized organization.'},{status:404});
  if(workspace==='para'){
   const access=(await base44.entities.ParaStudentAccess.filter({student_id:studentId,para_user_id:user.id,active:true},'-updated_at',1))?.[0];
   if(!access)return Response.json({error:'This student is not assigned to your Para account.'},{status:403});
  }

  const [gradeRows,progressRows,goalRows,sessionRows,attendanceRows]=await Promise.all([
   base44.entities.GradebookAssignment.filter({student_id:studentId},'-date',500),
   base44.entities.ProgressData.filter({student_id:studentId},'-date',500),
   base44.entities.Goal.filter({student_id:studentId},'-updated_date',100),
   base44.entities.SessionRecord.filter({student_id:studentId},'-date',500),
   base44.entities.AttendanceRecord.filter({user_id:user.id,workspace,student_id:studentId},'-date',300)
  ]);
  const paraRows=workspace==='para'?await base44.entities.ParaNote.filter({student_id:studentId,para_user_id:user.id},'-date',300):[];

  const usableGrades=(gradeRows||[]).filter(r=>r.verification_status!=='needs_teacher_review');
  const weeklyGrades=usableGrades.filter(r=>between(r.date,weekStart,weekEnd));
  const weeklyProgress=(progressRows||[]).filter(r=>r.record_status!=='duplicate'&&r.record_status!=='superseded'&&between(r.date,weekStart,weekEnd));
  const weeklySessions=(sessionRows||[]).filter(r=>between(r.date,weekStart,weekEnd));
  const weeklyAttendance=(attendanceRows||[]).filter(r=>between(r.date,weekStart,weekEnd));
  const weeklyPara=(paraRows||[]).filter(r=>between(r.date,weekStart,weekEnd));

  const latestByCourse={};
  for(const r of usableGrades){
   const course=clean(r.course||r.assignment_type||'Classroom');
   if(!latestByCourse[course]&&pctRow(r)!=null&&r.current_grade_percent!=null)latestByCourse[course]=r;
  }
  const courseGrades=Object.entries(latestByCourse).map(([course,r])=>({course,percentage:Number(r.current_grade_percent),letter:clean(r.current_grade_letter||''),date:String(r.date||'').slice(0,10),teacher:clean(r.gen_ed_teacher||'')})).sort((a,b)=>a.course.localeCompare(b.course));

  const scoredWeekly=weeklyGrades.filter(r=>Number(r.score_possible)>0);
  const earned=scoredWeekly.reduce((n,r)=>n+Number(r.score_earned||0),0),possible=scoredWeekly.reduce((n,r)=>n+Number(r.score_possible||0),0);
  const weeklyAverage=possible>0?Math.round((earned/possible)*1000)/10:null,progressAverage=avg(weeklyProgress.map(r=>r.percentage));
  const goalById=new Map((goalRows||[]).map(g=>[g.id,g]));

  const gradeTrend=weeklyGrades.map(r=>({name:String(r.date||'').slice(5)+(r.title?' · '+clean(r.title).slice(0,22):''),date:String(r.date||'').slice(0,10),title:clean(r.title||'Assignment'),course:clean(r.course||'Classroom'),percentage:pctRow(r)})).filter(x=>x.percentage!=null).sort((a,b)=>a.date.localeCompare(b.date));
  const currentCourseChart=courseGrades.map(x=>({name:x.course,percentage:x.percentage}));
  const progressTrend=weeklyProgress.map(r=>({name:String(r.date||'').slice(5),date:String(r.date||'').slice(0,10),percentage:Number(r.percentage),goal:clean(goalById.get(r.goal_id)?.goal_area||'Learning goal')})).filter(x=>Number.isFinite(x.percentage)).sort((a,b)=>a.date.localeCompare(b.date));

  const attendance={present:weeklyAttendance.filter(x=>x.status==='present').length,absent:weeklyAttendance.filter(x=>x.status==='absent').length,tardy:weeklyAttendance.filter(x=>x.status==='tardy').length,excused:weeklyAttendance.filter(x=>x.status==='excused').length,left_early:weeklyAttendance.filter(x=>x.status==='left_early').length};
  const supportMinutes=weeklyPara.reduce((n,r)=>n+Number(r.duration_minutes||0),0),sessionMinutes=weeklySessions.reduce((n,r)=>n+mins(r),0);
  const metrics={latest_course_grades:courseGrades,weekly_assignment_average:weeklyAverage,graded_assignments:scoredWeekly.length,missing_assignments:weeklyGrades.filter(r=>r.missing_assignment).length,progress_average:progressAverage,progress_points:weeklyProgress.length,attendance,support_notes:weeklyPara.length,support_minutes:supportMinutes,sessions:weeklySessions.length,session_minutes:sessionMinutes};

  const assignmentLines=weeklyGrades.slice(0,30).map(r=>`- ${String(r.date||'').slice(0,10)} | ${clean(r.course||'Classroom')} | ${clean(r.title||'Assignment')} | ${pctRow(r)==null?'no percentage recorded':pctRow(r)+'%'}${r.missing_assignment?' | marked missing':''}`).join('\n')||'- No graded assignment records in this week.';
  const currentGradeLines=courseGrades.map(g=>`- ${g.course}: ${g.percentage}%${g.letter?' ('+g.letter+')':''}, latest recorded ${g.date||'date not recorded'}`).join('\n')||'- No current course-grade percentages are recorded.';
  const progressLines=weeklyProgress.slice(0,30).map(r=>`- ${String(r.date||'').slice(0,10)} | ${clean(goalById.get(r.goal_id)?.goal_area||'Learning goal')} | ${r.percentage==null?'no percentage':r.percentage+'%'} | prompting ${clean(r.prompting_level||r.support_level||'not recorded')}`).join('\n')||'- No progress-monitoring percentage was recorded this week.';
  const paraLines=weeklyPara.slice(0,20).map(r=>`- ${String(r.date||'').slice(0,10)} | ${clean(r.activity||r.context||'support')} | ${clean(r.objective_observation||'')} | support ${clean(r.support_level||'not recorded')}`).join('\n')||'- No Para support observations were recorded this week.';
  const sessionLines=weeklySessions.slice(0,20).map(r=>`- ${String(r.date||'').slice(0,10)} | ${clean(r.activity||r.service_type||'session')} | ${mins(r)} minutes | ${clean(r.qualitative||'')}`).join('\n')||'- No service/session records were recorded this week.';

  const roleRule=workspace==='para'
   ?'This is a Para-generated draft. Keep the language objective and family-friendly. Do not claim the Para makes IEP, grading, diagnostic, or placement decisions. End with a short note that the draft should be reviewed by the teacher/case manager before family distribution.'
   :workspace==='sped'
    ?'Write as an educator/case-manager weekly family update. You may describe learning-goal progress, but do not disclose diagnosis/eligibility labels or unnecessary sensitive details.'
    :'Write as a general-education teacher weekly family update. Focus on classroom grades, work completion, observable strengths, and next instructional steps.';

  const prompt=`You are CaseCue's Weekly Family Update writer. Create a concise, warm, professional family communication using ONLY the verified CaseCue data below.

STRICT RULES:
- Never invent grades, percentages, assignment completion, attendance, behavior, progress, service minutes, diagnoses, accommodations, or events.
- Use exact percentages when present.
- Clearly distinguish "latest recorded course grade" from "weekly assignment average."
- If data is missing, say no new data was recorded rather than guessing.
- Do not mention disability, eligibility category, diagnosis, medical condition, or confidential IEP detail in this routine weekly update.
- Translate progress monitoring into family-friendly language such as "learning-goal check" when possible.
- Do not declare mastery or failure of an IEP goal from these records alone.
- Do not shame the student or family. Missing work can be stated factually.
- Mention 2-4 concrete positives when supported, 1-3 current focus areas when supported, and 1-3 reasonable next steps that follow directly from the documented data.
- Keep family_message about 180-320 words and ready to copy into email/text after educator review.
- ${roleRule}

STUDENT
Name: ${clean(student.first_name)} ${clean(student.last_name)}
Grade: ${clean(student.grade||'not recorded')}
Week: ${weekStart} through ${weekEnd}
Workspace: ${workspace}

LATEST RECORDED COURSE GRADES
${currentGradeLines}

THIS WEEK'S GRADED WORK
Weekly weighted assignment average: ${weeklyAverage==null?'not available':weeklyAverage+'%'}
Graded assignments: ${scoredWeekly.length}
Missing assignment records this week: ${weeklyGrades.filter(r=>r.missing_assignment).length}
${assignmentLines}

THIS WEEK'S LEARNING-GOAL DATA
Average of recorded percentage points: ${progressAverage==null?'not available':progressAverage+'%'}
${progressLines}

ATTENDANCE RECORDED BY THIS USER/WORKSPACE
Present ${attendance.present}, absent ${attendance.absent}, tardy ${attendance.tardy}, excused ${attendance.excused}, left early ${attendance.left_early}.

SUPPORT / SESSION DATA
Para observations: ${weeklyPara.length}; Para support minutes: ${supportMinutes}
${paraLines}
Sessions: ${weeklySessions.length}; delivered/session minutes: ${sessionMinutes}
${sessionLines}

Return JSON only with:
subject_line: short family-friendly subject
family_message: complete weekly communication
strengths: array of supported positives
focus_areas: array of supported current focus areas
next_steps: array of supported next steps
data_notes: array of important missing-data/interpretation notes for the educator, not the family.`;

  const schema={type:'object',properties:{subject_line:{type:'string'},family_message:{type:'string'},strengths:{type:'array',items:{type:'string'}},focus_areas:{type:'array',items:{type:'string'}},next_steps:{type:'array',items:{type:'string'}},data_notes:{type:'array',items:{type:'string'}}},required:['subject_line','family_message','strengths','focus_areas','next_steps','data_notes']};
  const ai=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,response_json_schema:schema,model:'automatic'});
  const generated=typeof ai==='object'?ai:JSON.parse(ai),now=new Date().toISOString();
  const chartData={grade_trend:gradeTrend,current_course_grades:currentCourseChart,progress_trend:progressTrend};
  const sourceCounts={grade_records:weeklyGrades.length,progress_records:weeklyProgress.length,attendance_records:weeklyAttendance.length,para_notes:weeklyPara.length,session_records:weeklySessions.length};

  const rec=await base44.entities.WeeklyFamilyUpdate.create({
   organization_id:org,user_id:user.id,workspace,student_id:studentId,student_name:`${clean(student.first_name)} ${clean(student.last_name)}`.trim(),
   week_start:weekStart,week_end:weekEnd,status:'draft',subject_line:generated.subject_line||`Weekly update for ${clean(student.first_name)}`,family_message:generated.family_message||'',
   strengths:generated.strengths||[],focus_areas:generated.focus_areas||[],next_steps:generated.next_steps||[],data_notes:generated.data_notes||[],
   metrics,chart_data:chartData,source_counts:sourceCounts,generated_at:now,updated_at:now
  });
  return Response.json({ok:true,update:rec,student:{id:student.id,first_name:student.first_name,last_name:student.last_name,grade:student.grade},metrics,chart_data:chartData,source_counts:sourceCounts});
 }catch(error){console.error('generateWeeklyFamilyUpdate failed',error);return Response.json({error:error?.message||'Could not generate the weekly family update.'},{status:500})}
}
