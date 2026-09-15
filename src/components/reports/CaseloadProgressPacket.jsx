import React, { useMemo, useState } from "react";
import { Printer, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name = s => `${s.first_name || ""} ${s.last_name || ""}`.trim();
const hasStudent = (s,id) => s?.student_id === id || (s?.student_ids || []).includes(id);
const minutes = s => Number(s?.delivered_minutes ?? s?.duration_minutes ?? s?.minutes ?? 0) || 0;
const evidenceText = s => `${s?.quantitative?.raw || ""} ${s?.qualitative || s?.notes || ""}`.trim();
const pct = p => Number.isFinite(Number(p?.percentage)) ? Number(p.percentage) : null;
const inRange = (d,from,to) => !!d && (!from || d >= from) && (!to || d <= to);

function uniqueSessions(items=[]) {
  const seen = new Set();
  return items.filter(s => {
    const key = `${s.student_id || (s.student_ids||[]).join(',')}|${s.date}|${s.start_time||''}|${String(s.activity||'').trim().toLowerCase()}|${minutes(s)}|${s.quantitative?.raw||''}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}

function goalSummary(goal, points) {
  const measured = points.filter(p => pct(p) != null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if (!measured.length) return `No goal-linked percentage data are recorded for this reporting period. Additional progress-monitoring evidence is needed before a trend can be described.`;
  const first = pct(measured[0]), last = pct(measured[measured.length-1]);
  if (measured.length === 1) return `One goal-linked measurement is recorded at ${last}%. One point is not enough to establish a trend; continue collecting comparable probes.`;
  const change = Math.round((last-first)*10)/10;
  const direction = change >= 5 ? "increased" : change <= -5 ? "decreased" : "remained relatively stable";
  return `Across ${measured.length} goal-linked measurements, performance ${direction} from ${first}% to ${last}% (${change > 0 ? "+" : ""}${change} points). This describes recorded performance only and does not independently determine goal mastery.`;
}

function audit(sessions=[]) {
  const keys = new Map(); let contradictions=0, missingGoal=0, missingQuant=0, missingNarrative=0;
  sessions.forEach(s => {
    const k=`${s.student_id||''}|${s.date}|${s.start_time||''}|${String(s.activity||'').trim().toLowerCase()}|${minutes(s)}|${s.quantitative?.raw||''}`; keys.set(k,(keys.get(k)||0)+1);
    const ev=evidenceText(s); if (["student_absent","provider_absent"].includes(s.status) && /\b(participat|engag|completed|worked|respond|correct|accuracy)\w*/i.test(ev)) contradictions++;
    if (!s.goal_id) missingGoal++; if (!s.quantitative?.raw && s.quantitative?.percentage == null && s.quantitative?.correct == null) missingQuant++; if (!(s.qualitative||s.notes)) missingNarrative++;
  });
  return { duplicates:[...keys.values()].reduce((n,v)=>n+Math.max(0,v-1),0), contradictions, missingGoal, missingQuant, missingNarrative };
}

export default function CaseloadProgressPacket({students=[],goals=[],progress=[],sessions=[]}) {
  const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [studentId,setStudentId]=useState("all");
  const filteredSessions=useMemo(()=>uniqueSessions(sessions.filter(s=>inRange(s.date,from,to))),[sessions,from,to]);
  const filteredProgress=useMemo(()=>progress.filter(p=>inRange(p.date,from,to)),[progress,from,to]);
  const quality=useMemo(()=>audit(sessions),[sessions]);

  const printPacket=()=>{
    const chosen=studentId==='all'?students:students.filter(s=>s.id===studentId);
    const overview=chosen.map(st=>{const ss=filteredSessions.filter(s=>hasStudent(s,st.id)); const pp=filteredProgress.filter(p=>p.student_id===st.id); return `<tr><td>${esc(name(st))}</td><td>${esc(st.grade||'—')}</td><td>${goals.filter(g=>g.student_id===st.id).length}</td><td>${ss.length}</td><td>${ss.reduce((n,s)=>n+minutes(s),0)}</td><td>${pp.length}</td></tr>`}).join('');
    const pages=chosen.map(st=>{
      const gs=goals.filter(g=>g.student_id===st.id); const ss=filteredSessions.filter(s=>hasStudent(s,st.id)); const pp=filteredProgress.filter(p=>p.student_id===st.id);
      const goalHtml=gs.length?gs.map(g=>{const pts=pp.filter(p=>p.goal_id===g.id).sort((a,b)=>String(a.date).localeCompare(String(b.date))); const measured=pts.filter(p=>pct(p)!=null); const bars=measured.slice(-12).map(p=>`<div class="barWrap"><div class="bar" style="height:${Math.max(3,Math.min(100,pct(p)))}%"></div><small>${esc(String(p.date||'').slice(5))}</small></div>`).join(''); return `<section><h3>${esc(g.goal_area||'IEP Goal')}</h3><p class="goal">${esc(g.goal_text||'Goal text not recorded')}</p><div class="meta"><b>Baseline:</b> ${esc(g.baseline||'Not recorded')} &nbsp; <b>Target:</b> ${esc(g.target||'Not recorded')}</div><div class="chart">${bars||'<span class="muted">No percentage data linked to this goal in the selected period.</span>'}</div><p><b>CaseCue Summary:</b> ${esc(goalSummary(g,pts))}</p></section>`}).join(''):'<p class="muted">No IEP goals are recorded for this student.</p>';
      return `<article class="student"><h1>${esc(name(st))}</h1><div class="meta">Grade ${esc(st.grade||'—')} · ${esc(st.eligibility_category||'Eligibility not recorded')} · IEP ${esc(st.iep_date||'date not recorded')} · Review due ${esc(st.annual_review_due||'not recorded')}</div><div class="snapshot"><div><b>${gs.length}</b><span>IEP goals</span></div><div><b>${ss.length}</b><span>sessions</span></div><div><b>${ss.reduce((n,s)=>n+minutes(s),0)}</b><span>minutes delivered</span></div><div><b>${pp.length}</b><span>progress points</span></div></div><h2>IEP Goal Progress</h2>${goalHtml}<h2>Student Snapshot</h2><p><b>Present levels:</b> ${esc(st.present_levels||'Not recorded')}</p><p><b>Strengths:</b> ${esc(st.strengths||'Not recorded')}</p><p><b>Areas of need:</b> ${esc(st.areas_of_need||'Not recorded')}</p><p><b>Accommodations:</b> ${esc(Array.isArray(st.accommodations)?st.accommodations.join('; '):(st.accommodations||'Not recorded'))}</p><footer>Generated from recorded CaseCue data. Missing information is shown as missing. Educator review required before distribution.</footer></article>`;
    }).join('');
    const w=window.open('','_blank'); if(!w)return;
    w.document.write(`<!doctype html><html><head><title>CaseCue Caseload Progress Packet</title><style>@page{margin:.55in}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:24px;margin:0 0 5px}h2{font-size:17px;border-bottom:2px solid #dbeafe;padding-bottom:5px;margin-top:20px}h3{font-size:14px;margin-bottom:5px}.cover{page-break-after:always}.student{page-break-before:always}.student:first-of-type{page-break-before:auto}.meta,.muted{color:#64748b;font-size:11px}.goal{font-size:12px}.snapshot{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.snapshot div{border:1px solid #dbe3ef;border-radius:8px;padding:10px}.snapshot b{display:block;font-size:20px}.snapshot span{font-size:10px;color:#64748b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #e2e8f0;padding:7px;text-align:left}.chart{height:110px;display:flex;align-items:flex-end;gap:5px;border-left:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;padding:6px;margin:10px 0}.barWrap{height:100%;flex:1;display:flex;flex-direction:column;justify-content:flex-end;text-align:center}.bar{background:#2563eb;min-height:3px}.barWrap small{font-size:7px;color:#64748b;margin-top:2px}section{break-inside:avoid;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin:10px 0}p{font-size:11px;line-height:1.45}footer{margin-top:18px;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:7px}@media print{button{display:none}}</style></head><body><div class="cover"><h1>CaseCue Caseload Progress Packet</h1><p class="meta">${esc(from||'All dates')} to ${esc(to||'current')} · ${chosen.length} student(s)</p><h2>Caseload Overview</h2><table><thead><tr><th>Student</th><th>Grade</th><th>Goals</th><th>Sessions</th><th>Minutes</th><th>Progress Pts</th></tr></thead><tbody>${overview}</tbody></table><p class="meta">Duplicate session rows are automatically counted once in this packet.</p></div>${pages}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`); w.document.close();
  };

  return <Card className="p-5 mb-8 border-blue-100">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-700"/><h2 className="font-black text-lg">Caseload Progress Packet</h2></div><p className="text-sm text-slate-600 mt-1">Print every student at once with IEP goals, goal-by-goal charts, service evidence, and data-grounded summaries.</p></div><div className="flex flex-wrap gap-2"><select className="rounded-lg border px-3 py-2 text-sm" value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="all">All students</option>{students.map(s=><option key={s.id} value={s.id}>{name(s)}</option>)}</select><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-40"/><Input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-40"/><Button onClick={printPacket} className="bg-blue-700 hover:bg-blue-800 text-white"><Printer className="h-4 w-4 mr-2"/>Generate & Print</Button></div></div>
    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm"><div className="rounded-xl bg-slate-50 p-3"><b>{quality.duplicates}</b><div className="text-xs text-slate-500">duplicate rows excluded</div></div><div className="rounded-xl bg-slate-50 p-3"><b>{quality.contradictions}</b><div className="text-xs text-slate-500">absence/data conflicts</div></div><div className="rounded-xl bg-slate-50 p-3"><b>{quality.missingGoal}</b><div className="text-xs text-slate-500">sessions missing goal link</div></div><div className="rounded-xl bg-slate-50 p-3"><b>{quality.missingQuant}</b><div className="text-xs text-slate-500">sessions missing quantitative data</div></div><div className="rounded-xl bg-slate-50 p-3"><b>{quality.missingNarrative}</b><div className="text-xs text-slate-500">sessions missing narrative</div></div></div>
    {(quality.contradictions>0||quality.duplicates>0)&&<div className="mt-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3"><AlertTriangle className="h-4 w-4 shrink-0"/>The packet protects reports by deduplicating identical session rows. Any remaining absence/performance conflicts should be reviewed before distribution.</div>}
  </Card>;
}
