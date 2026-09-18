
import React from "react";
import {Card} from "@/components/ui/cards";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
  Eye,FileText,RefreshCw,Loader2,UserCheck,
  CheckSquare,Filter,ShieldCheck,Target
} from "lucide-react";

const isDuplicate=x=>!!x.duplicate_of_evidence_id||x.duplicate_status==="duplicate";
const hasSupportedScore=x=>Number(x.score_possible)>0&&Number.isFinite(Number(x.score_earned));
const subjectKind=x=>{const s=String([x.subject,x.detected_title,...(x.skills||[])].join(" ")).toLowerCase();if(/writing|narrative|opinion|argument|story|sentence|paragraph/.test(s))return"writing";if(/math|multiplication|division|fraction|decimal|number|algebra|geometry/.test(s))return"math";if(/reading|fluency|comprehension|phonics|vocabulary/.test(s))return"reading";return"other"};
const canApprove=x=>!!x.student_id&&!isDuplicate(x)&&hasSupportedScore(x)&&!["not_scored","low"].includes(String(x.scoring_confidence||"").toLowerCase());
const reviewReason=x=>{if(isDuplicate(x))return"duplicate";if(!x.student_id)return"identity";if(!hasSupportedScore(x)||["not_scored","low"].includes(String(x.scoring_confidence||"")))return"grade";if(subjectKind(x)==="writing"&&x.scoring_confidence!=="high")return"writing";return"ready"};
const identityPct=x=>Number(x.identity_match_score||({high:95,medium:85,low:65,teacher_confirmed:100}[x.student_match_confidence]||0));
const evidenceLabel=v=>({strong:"Strong Evidence",supporting:"Supporting Evidence",classroom_only:"Classroom Work Only",needs_review:"Needs Review"}[v]||"Needs Review");
const alignedScore=x=>{const rows=x.goal_aligned_items||[];const possible=rows.reduce((n,r)=>n+Number(r.possible||0),0),earned=rows.reduce((n,r)=>n+Number(r.earned||0),0);return possible>0?(earned+"/"+possible+" · "+(Math.round(earned/possible*1000)/10)+"%"):""};

export default function BatchReviewQueue({
  items=[],students=[],goals=[],stats={},reviewFilter="all",setReviewFilter,
  confirming,confirmProbableMatches,approveAllReady,update,confirmStudent,
  openEvidence,regradeItem,regradingKey,openIep,goalName,
  selectedCount,selectedGoalCount,saving,onFileScores,onFileGoals
}){
  const sortedStudents=[...students].sort((a,b)=>(String(a.last_name||"")+", "+String(a.first_name||"")).localeCompare(String(b.last_name||"")+", "+String(b.first_name||""),undefined,{sensitivity:"base"}));
  const studentName=id=>{const s=students.find(x=>x.id===id);return s?(s.first_name+" "+s.last_name):"Unmatched student"};
  const visible=items.filter(x=>reviewFilter==="all"||reviewReason(x)===reviewFilter);

  return <>
    <Card className="overflow-hidden border-blue-100">
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-violet-950 p-5 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">Batch Intelligence</div>
            <h3 className="mt-1 text-2xl font-black">Here is what CaseCue handled.</h3>
            <p className="mt-1 text-sm text-slate-300">Identity and score confidence stay separate, so you only resolve the actual exception.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center">
            <div className="text-3xl font-black">{stats.handled||0}%</div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-300">ready to approve</div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[
          ["Pages",stats.pages||"—"],["Students",stats.uniqueStudents||0],["Artifacts",stats.newItems||0],
          ["Math",stats.math||0],["Writing",stats.writing||0],["Ready",stats.ready||0]
        ].map(([label,value])=><div key={label} className="rounded-2xl border bg-white p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>)}
      </div>
      <div className="grid gap-3 border-t bg-slate-50 p-5 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-3"><div className="text-xs font-black text-amber-700">Identity confirmations</div><div className="mt-1 text-2xl font-black">{stats.identity||0}</div><div className="text-xs text-slate-500">{stats.probable||0} probable roster match{stats.probable===1?"":"es"}</div></div>
        <div className="rounded-xl border bg-white p-3"><div className="text-xs font-black text-rose-700">Grading questions</div><div className="mt-1 text-2xl font-black">{(stats.grade||0)+(stats.writing||0)}</div><div className="text-xs text-slate-500">Numeric or rubric decisions remaining</div></div>
        <div className="rounded-xl border bg-white p-3"><div className="text-xs font-black text-blue-700">Estimated teacher review</div><div className="mt-1 text-2xl font-black">~{stats.estimatedMinutes||1} min</div><div className="text-xs text-slate-500">Estimate based on remaining exceptions</div></div>
      </div>
    </Card>

    <Card className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">Review Queue</div><h3 className="text-xl font-black">Only check what needs your eyes.</h3><p className="text-sm text-slate-500">{items.length} artifacts · {stats.ready||0} ready · {stats.identity||0} identity · {stats.grade||0} grading · {stats.duplicates||0} duplicates</p></div>
        <div className="flex flex-wrap gap-2">
          {(stats.probable||0)>0&&<Button variant="outline" disabled={confirming} onClick={confirmProbableMatches}>{confirming?<Loader2 className="mr-1 h-4 w-4 animate-spin"/>:<UserCheck className="mr-1 h-4 w-4"/>}Confirm {stats.probable} probable</Button>}
          {(stats.ready||0)>0&&<Button variant="outline" onClick={approveAllReady}><CheckSquare className="mr-1 h-4 w-4"/>Select {stats.ready} ready grades</Button>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[["all","All"],["ready","Ready"],["identity","Identity"],["grade","Grade"],["writing","Writing"],["duplicate","Duplicates"]].map(([value,label])=><button key={value} onClick={()=>setReviewFilter(value)} className={"rounded-full border px-3 py-1.5 text-xs font-bold "+(reviewFilter===value?"border-blue-700 bg-blue-700 text-white":"bg-white text-slate-600")}><Filter className="mr-1 inline h-3 w-3"/>{label}</button>)}
      </div>
    </Card>

    <div className="space-y-3">
      {visible.map(x=>{
        const i=items.findIndex(v=>v._key===x._key),reason=reviewReason(x),idPct=identityPct(x),probable=x.probable_student_name||"",supportRows=x.error_patterns||[];
        const border=reason==="ready"?"border-emerald-200":reason==="identity"?"border-amber-200":reason==="duplicate"?"border-slate-200":"border-rose-200";
        return <Card key={x._key} className={"overflow-hidden border-2 "+border}>
          <div className="border-b bg-slate-50/70 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-lg">{x.student_id?studentName(x.student_id):(probable?("Probable: "+probable):(x.student_name?("Detected: "+x.student_name):"Student not matched"))}</span>
                  <span className={"rounded-full px-2 py-1 text-[10px] font-black uppercase "+(x.identity_status==="teacher_confirmed"?"bg-emerald-100 text-emerald-800":x.student_id?"bg-blue-100 text-blue-800":probable?"bg-amber-100 text-amber-800":"bg-slate-200 text-slate-700")}>Identity {idPct?(idPct+"%"):(x.identity_status||"unmatched")}</span>
                  <span className={"rounded-full px-2 py-1 text-[10px] font-black uppercase "+(x.scoring_confidence==="high"?"bg-emerald-100 text-emerald-800":x.scoring_confidence==="medium"||x.scoring_confidence==="teacher_confirmed"?"bg-amber-100 text-amber-800":"bg-slate-200 text-slate-700")}>Score {x.scoring_confidence||"not scored"}</span>
                  {isDuplicate(x)&&<span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase text-rose-800">Duplicate · skipped</span>}
                </div>
                {x.identity_basis&&<div className="mt-1 text-xs text-slate-500">Identity evidence: {x.identity_basis}</div>}
                {(x.identity_reasons||[]).map((r,ri)=><div key={ri} className="mt-1 text-xs text-amber-700">{r}</div>)}
              </div>
              <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold"><input type="checkbox" checked={!!x.approved&&!isDuplicate(x)} disabled={!canApprove(x)} onChange={e=>update(i,{approved:e.target.checked,identity_status:e.target.checked&&x.student_id?"teacher_confirmed":x.identity_status})}/>Approve grade</label>
            </div>
          </div>

          <div className="p-4">
            {!x.student_id&&probable?<div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Probable student</div>
              <div className="mt-1 text-xl font-black">{probable}</div><div className="text-sm text-amber-800">{idPct}% name match</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={()=>confirmStudent(i,x,x.probable_student_id)} className="bg-amber-700 text-white"><UserCheck className="mr-1 h-4 w-4"/>Confirm {probable.split(" ")[0]}</Button>
                <select className="h-10 rounded-lg border bg-white px-3 text-sm" defaultValue="" onChange={e=>e.target.value&&confirmStudent(i,x,e.target.value)}><option value="">Choose someone else…</option>{sortedStudents.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select>
              </div>
            </div>:<div className="mb-4"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Student</div><select className="mt-1 h-10 w-full max-w-xl rounded-lg border-2 border-blue-200 bg-white px-3 text-sm font-semibold" value={x.student_id||""} onChange={e=>e.target.value&&confirmStudent(i,x,e.target.value)}><option value="">Choose student…</option>{sortedStudents.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>}

            <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="max-w-2xl font-bold" value={x.detected_title||""} onChange={e=>update(i,{detected_title:e.target.value.replace(/<[^>]*>/g,"").trim(),approved:false})}/>
                  <Button size="sm" variant="outline" onClick={()=>openEvidence(x)}><Eye className="mr-1 h-3.5 w-3.5"/>Open work</Button>
                  <Button size="sm" className="bg-blue-700 text-white" disabled={regradingKey===x._key||!x.student_id} onClick={()=>regradeItem(i,x)}>{regradingKey===x._key?<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="mr-1 h-3.5 w-3.5"/>}{regradingKey===x._key?"Regrading…":"Regrade"}</Button>
                </div>
                <div className="mt-1 text-xs font-semibold text-blue-700">{x.pages||""}</div>
                <div className="mt-2 flex flex-wrap gap-1">{(x.skills||[]).map(s=><span key={s} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">{s}</span>)}</div>
              </div>
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Teacher score</div>
                <div className="mt-2 grid grid-cols-2 gap-2"><div><div className="text-[10px] text-slate-500">Correct / earned</div><Input type="number" min="0" value={x.score_earned??0} onChange={e=>update(i,{score_earned:Number(e.target.value||0),approved:false})}/></div><div><div className="text-[10px] text-slate-500">Attempted / possible</div><Input type="number" min="0" value={x.score_possible??0} onChange={e=>update(i,{score_possible:Number(e.target.value||0),approved:false})}/></div></div>
                <div className="mt-3 text-xl font-black text-blue-800">{x.score_possible>0?(x.score_earned+"/"+x.score_possible+" · "+x.percentage+"%"):"Score pending"}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Why this score confidence?</div>
                <div className="mt-1 space-y-1">{(x.score_confidence_reasons||[]).slice(0,5).map((r,ri)=><div key={ri} className="text-xs text-slate-600">• {r}</div>)}{!(x.score_confidence_reasons||[]).length&&<div className="text-xs text-slate-400">No confidence details yet.</div>}</div>
              </div>
            </div>

            {(x.question_breakdown||x.scoring_breakdown||[]).length>0&&<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Problem Check</div><div className="mt-2 grid gap-1.5">{(x.question_breakdown||x.scoring_breakdown||[]).slice(0,50).map((q,qi)=><div key={qi} className="grid gap-2 rounded-lg bg-white px-3 py-2 text-xs sm:grid-cols-[.45fr_1.2fr_1fr_1fr_.55fr]"><div className="font-bold">{q.item||q.label||("#"+(qi+1))}</div><div className="truncate text-slate-600">{q.problem_text||"Problem"}</div><div className="truncate text-slate-600">Student: {q.student_response||"—"}</div><div className="truncate text-slate-600">Correct: {q.correct_answer||"—"}</div><div className="text-right font-black">{Number(q.possible||0)>0?(Number(q.earned||0)+"/"+Number(q.possible||0)):"Review"}</div></div>)}</div></div>}

            {(x.rubric_breakdown||[]).length>0&&<div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-wider text-violet-700">Rubric Check</div><div className="mt-1 text-sm font-semibold text-slate-700">CaseCue applied the teacher-provided rubric. Review each criterion before approving the writing score.</div></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">Teacher review required</span></div>
              <div className="mt-3 space-y-2">{x.rubric_breakdown.map((row,ri)=><div key={ri} className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-[1fr_1.5fr_.42fr_.42fr]"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Criterion</div><div className="mt-1 text-sm font-bold">{row.criterion||("Criterion "+(ri+1))}</div></div><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Visible evidence</div><div className="mt-1 text-xs text-slate-600">{row.evidence||row.note||"No evidence note returned."}</div></div><div><div className="text-[10px] text-slate-500">Earned</div><Input type="number" min="0" value={row.earned??0} onChange={e=>{const rows=(x.rubric_breakdown||[]).map((r,n)=>n===ri?{...r,earned:Number(e.target.value||0)}:r),earned=rows.reduce((n,r)=>n+Number(r.earned||0),0),possible=rows.reduce((n,r)=>n+Number(r.possible||0),0);update(i,{rubric_breakdown:rows,score_earned:earned,score_possible:possible,approved:false})}}/></div><div><div className="text-[10px] text-slate-500">Possible</div><Input type="number" min="0" value={row.possible??0} onChange={e=>{const rows=(x.rubric_breakdown||[]).map((r,n)=>n===ri?{...r,possible:Number(e.target.value||0)}:r),earned=rows.reduce((n,r)=>n+Number(r.earned||0),0),possible=rows.reduce((n,r)=>n+Number(r.possible||0),0);update(i,{rubric_breakdown:rows,score_earned:earned,score_possible:possible,approved:false})}}/></div></div>)}</div>
            </div>}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">What the work shows</div>{x.score_possible>0&&<div className="mt-1 text-base font-black">{x.score_earned} of {x.score_possible} correct / earned ({x.percentage}%).</div>}<div className="mt-2 text-sm text-slate-700">{x.qualitative_notes||"No additional observation saved."}</div>{(x.strengths_observed||[]).length>0&&<div className="mt-3 text-xs text-emerald-700"><b>Observed strengths:</b> {x.strengths_observed.join(" · ")}</div>}{supportRows.length>0&&<div className="mt-1 text-xs text-amber-700"><b>Skills needing support:</b> {supportRows.join(" · ")}</div>}</div>
              <div className="rounded-xl border p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Instructional interpretation</div><div className="mt-2 text-sm text-slate-700">{x.instructional_next_step||"Teacher review can add the next instructional step."}</div><div className="mt-3 flex flex-wrap gap-1">{["Independent","Verbal Prompt","Visual Support","Calculator","Read Aloud","Extended Time"].map(t=><button type="button" key={t} onClick={()=>update(i,{teacher_supports:[...(x.teacher_supports||[]).filter(v=>v!==t),...((x.teacher_supports||[]).includes(t)?[]:[t])]})} className={"rounded-full border px-2 py-1 text-[10px] font-bold "+((x.teacher_supports||[]).includes(t)?"border-blue-600 bg-blue-50 text-blue-800":"bg-white text-slate-600")}>{t}</button>)}</div></div>
            </div>

            {!!goals.length&&<div className={"mt-4 rounded-xl border p-4 "+(x.goal_match_confidence==="high"||x.goal_match_confidence==="teacher_confirmed"?"border-emerald-200 bg-emerald-50":"border-slate-200 bg-slate-50")}>
              <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">IEP connection</div><div className="mt-1 text-sm font-bold">{goalName(x.suggested_goal_id)}</div></div>{x.student_id&&<Button size="sm" variant="outline" onClick={()=>openIep(x.student_id)}><FileText className="mr-1 h-3.5 w-3.5"/>View IEP</Button>}</div>
              {x.student_id&&<div className="mt-2"><select className="h-10 w-full rounded-lg border-2 border-blue-200 bg-white px-3 text-xs font-semibold" value={x.suggested_goal_id||""} onChange={e=>update(i,{suggested_goal_id:e.target.value,goal_match_confidence:e.target.value?"teacher_confirmed":"none",approved:false})}><option value="">Not IEP goal evidence / No goal match</option>{goals.filter(g=>g.student_id===x.student_id&&g.status!=="archived").sort((a,b)=>String(a.goal_area||"").localeCompare(String(b.goal_area||""))).map(g=><option key={g.id} value={g.id}>{g.goal_area||"Goal"} — {(g.goal_text||"").slice(0,180)}</option>)}</select><div className="mt-1 text-[11px] text-slate-500">Goal evidence is only created if you explicitly choose “Scores + Goal Evidence” when filing.</div></div>}
              {x.goal_alignment&&<div className="mt-2 text-xs text-slate-600">{x.goal_alignment}</div>}
              {x.evidence_strength&&<div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase">{evidenceLabel(x.evidence_strength)}</span>{alignedScore(x)&&<span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black uppercase text-violet-800">Goal items {alignedScore(x)}</span>}</div>}
            </div>}

            {(x.cautions||[]).length>0&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{x.cautions.join(" · ")}</div>}
          </div>
        </Card>
      })}
      {!visible.length&&<Card className="p-8 text-center text-sm text-slate-500">No artifacts match this review filter.</Card>}
    </div>

    <Card className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">Ready to file</div><h3 className="text-xl font-black">{selectedCount} grade{selectedCount===1?"":"s"} selected</h3><p className="text-sm text-slate-500">Filing scores does not automatically create IEP progress evidence.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving||!selectedCount} onClick={onFileScores} className="bg-slate-950 text-white"><ShieldCheck className="mr-1 h-4 w-4"/>{saving?"Filing…":("File "+selectedCount+" Score"+(selectedCount===1?"":"s")+" Only")}</Button>
          <Button disabled={saving||!selectedCount||!selectedGoalCount} onClick={onFileGoals} className="bg-emerald-700 text-white"><Target className="mr-1 h-4 w-4"/>File + Goal Evidence ({selectedGoalCount})</Button>
        </div>
      </div>
    </Card>
  </>;
}
