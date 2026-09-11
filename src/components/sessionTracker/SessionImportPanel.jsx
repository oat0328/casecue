import React, { useMemo, useRef, useState } from "react";
import readXlsxFile from "read-excel-file";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

const aliases = {
  student: ["student","student name","name","studentname","student_name"],
  first_name: ["first name","firstname","first_name"],
  last_name: ["last name","lastname","last_name"],
  date: ["date","session date","service date","session_date"],
  start_time: ["start time","start","time","session time","start_time"],
  end_time: ["end time","end","end_time"],
  duration_minutes: ["duration","duration minutes","minutes","session minutes","duration_minutes"],
  provider: ["provider","teacher","staff","service provider"],
  service_type: ["service type","service","subject","service area","area of service","service_type"],
  delivery: ["delivery","individual/group","individual or group","session type","group"],
  setting: ["setting","push in/pull out","push-in/pull-out","push or pull","location type"],
  location: ["location","room"],
  goal: ["goal","goal area","iep goal","goal name","goal_area"],
  activity: ["activity","skill","assignment","lesson","activity or skill","focus"],
  scheduled_minutes: ["scheduled minutes","required minutes","scheduled","scheduled_minutes"],
  delivered_minutes: ["delivered minutes","minutes delivered","service minutes","clean minutes","delivered","delivered_minutes"],
  status: ["status","attendance","session status"],
  correct: ["correct","points earned","earned"],
  total: ["total","possible","points possible","attempted"],
  percentage: ["percentage","percent","accuracy","score"],
  quantitative_note: ["quantitative","quantitative numbers student performance notes","student performance data"],
  qualitative: ["qualitative","qualitative notes","qualitative narrative student performance notes","notes","observation","observation notes","narrative","session notes"],
  follow_up_note: ["follow up","follow-up","follow up note","next step"],
};

const normalize = (v) => String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normalizeName = (v) => normalize(v).replace(/\s+/g, " ");
const cellText = (v) => v instanceof Date ? v.toISOString().slice(0,10) : String(v ?? "").trim();

function csvRows(text) {
  const rows=[]; let row=[]; let cell=""; let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"') { if(quoted && text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
    else if(ch===',' && !quoted){row.push(cell);cell="";}
    else if((ch==='\n'||ch==='\r') && !quoted){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cell); if(row.some(x=>String(x).trim())) rows.push(row); row=[]; cell=""; }
    else cell+=ch;
  }
  row.push(cell); if(row.some(x=>String(x).trim())) rows.push(row); return rows;
}

function indexMap(headers){
  const h=headers.map(normalize); const out={};
  Object.entries(aliases).forEach(([key,list])=>{
    const normalized=list.map(normalize);
    const idx=h.findIndex(x=>normalized.some(a=>x===a || (a.length>=5 && x.includes(a)) || (x.length>=5 && a.includes(x))));
    if(idx>=0) out[key]=idx;
  });
  // Legacy/Google Form session trackers sometimes have a student's name in the
  // second column header and the form date itself in the third header cell.
  // Detect that layout from the surrounding stable columns rather than rejecting it.
  if(out.student==null && h[0]?.includes('timestamp') && h[3]?.includes('service minutes')) out.student=1;
  if(out.date==null && h[0]?.includes('timestamp') && h[3]?.includes('service minutes')) out.date=2;
  if(out.delivered_minutes==null && h[4]?.includes('clean minutes')) out.delivered_minutes=4;
  if(out.service_type==null && h[5]?.includes('area of service')) out.service_type=5;
  if(out.location==null && h[6]?.includes('location of services')) out.location=6;
  if(out.quantitative_note==null && h[7]?.includes('quantitative')) out.quantitative_note=7;
  if(out.qualitative==null && h[8]?.includes('qualitative')) out.qualitative=8;
  return out;
}
function get(row,map,key){ return map[key] == null ? "" : cellText(row[map[key]]); }
function num(v){ const s=String(v||'').replace(/,/g,'').trim(); const m=s.match(/-?\d+(?:\.\d+)?/); if(!m)return null; const n=Number(m[0]); return Number.isFinite(n)?n:null; }
function fraction(v){ const m=String(v||'').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/); return m?{correct:Number(m[1]),total:Number(m[2])}:null; }
function dateValue(v){
  if(v instanceof Date) return v.toISOString().slice(0,10);
  const s=String(v||"").trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d=new Date(s); return Number.isNaN(d.getTime())?"":d.toISOString().slice(0,10);
}
function timeValue(v){ const s=String(v||"").trim(); const m=s.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i); if(!m) return s; let h=Number(m[1]); if(m[3]){ if(m[3].toLowerCase()==='pm'&&h<12)h+=12; if(m[3].toLowerCase()==='am'&&h===12)h=0; } return `${String(h).padStart(2,'0')}:${m[2]}`; }
function minutesBetween(start,end){ if(!start||!end) return null; const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number); if([sh,sm,eh,em].some(Number.isNaN)) return null; let x=(eh*60+em)-(sh*60+sm); if(x<0)x+=1440; return x; }
function enumValue(v,type){
  const s=normalize(v);
  if(type==='delivery') return s.includes('group')?'group':'individual';
  if(type==='setting') return s.includes('push')?'push_in':'pull_out';
  if(type==='status'){
    if(s.includes('student absent')||s==='absent') return 'student_absent'; if(s.includes('provider absent')||s.includes('teacher absent')) return 'provider_absent'; if(s.includes('partial')) return 'partially_completed'; if(s.includes('refus')) return 'refused'; if(s.includes('resched')) return 'rescheduled'; if(s.includes('makeup')||s.includes('make up')) return 'makeup_session'; if(s.includes('cancel')) return 'canceled'; return 'completed';
  }
  if(type==='service'){
    if(s.includes('speech')) return 'speech'; if(s.includes('occup')) return 'occupational_therapy'; if(s.includes('physical')) return 'physical_therapy'; if(s.includes('counsel')) return 'counseling'; if(s.includes('behavior')) return 'behavior_support'; if(s.includes('general')) return 'general_education'; if(s.includes('special')||s.includes('resource')||s.includes('math')||s.includes('reading')||s.includes('writing')) return 'special_education'; return 'other';
  }
  return v;
}

export default function SessionImportPanel({students=[],goals=[],sessions=[],onImported}){
  const {toast}=useToast(); const inputRef=useRef(null);
  const [rows,setRows]=useState([]); const [fileName,setFileName]=useState(""); const [busy,setBusy]=useState(false); const [summary,setSummary]=useState(null);
  const studentByName=useMemo(()=>{const m=new Map(); students.forEach(s=>{m.set(normalizeName(`${s.first_name} ${s.last_name}`),s.id);m.set(normalizeName(`${s.last_name} ${s.first_name}`),s.id);});return m;},[students]);
  const goalFor=(sid,text)=>{if(!sid||!text)return '';const q=normalize(text);const matches=goals.filter(g=>g.student_id===sid);return (matches.find(g=>normalize(g.goal_area)===q)||matches.find(g=>normalize(g.goal_text).includes(q)||q.includes(normalize(g.goal_area))))?.id||'';};
  const duplicateKeys=useMemo(()=>new Set((sessions||[]).map(s=>`${s.student_id}|${s.date}|${s.start_time||''}|${normalize(s.activity||'')}`)),[sessions]);

  const parseFile=async(file)=>{
    setSummary(null); if(!file)return; if(file.size>MAX_BYTES){toast({title:'File too large',description:'Use a session file under 5 MB.',variant:'destructive'});return;}
    const ext=file.name.split('.').pop()?.toLowerCase(); if(!['xlsx','csv'].includes(ext)){toast({title:'Unsupported file',description:'Upload Excel (.xlsx) or CSV.',variant:'destructive'});return;}
    setBusy(true);
    try{
      let raw;
      if(ext==='csv') raw=csvRows(await file.text());
      else raw=await readXlsxFile(file);
      if(raw.length<2) throw new Error('No data rows were found.');
      if(raw.length-1>MAX_ROWS) throw new Error(`This file has more than ${MAX_ROWS} rows. Split it into smaller imports.`);
      const map=indexMap(raw[0].map(cellText));
      if(map.date==null) throw new Error('I could not find a session date column.');
      if(map.student==null && (map.first_name==null || map.last_name==null)) throw new Error('I could not find a student name column.');
      const parsed=raw.slice(1).map((r,i)=>{
        const full=get(r,map,'student')||`${get(r,map,'first_name')} ${get(r,map,'last_name')}`.trim();
        const sid=studentByName.get(normalizeName(full))||'';
        const date=dateValue(map.date==null?'':r[map.date]); const start=timeValue(get(r,map,'start_time')); const end=timeValue(get(r,map,'end_time'));
        const statedDuration=num(get(r,map,'duration_minutes')); const delivered=num(get(r,map,'delivered_minutes')); const scheduled=num(get(r,map,'scheduled_minutes')); const duration=delivered??statedDuration??minutesBetween(start,end);
        const rawQuant=get(r,map,'quantitative_note'); const frac=fraction(rawQuant); const correct=num(get(r,map,'correct'))??frac?.correct??null, total=num(get(r,map,'total'))??frac?.total??null; let pct=num(get(r,map,'percentage')); if(pct==null && /%/.test(rawQuant)) pct=num(rawQuant); if(pct!=null && pct<=1 && String(get(r,map,'percentage')).includes('.') && !String(get(r,map,'percentage')).includes('%')) pct*=100; if(pct==null&&correct!=null&&total>0)pct=Math.round((correct/total)*1000)/10;
        const goalText=get(r,map,'goal'); const gid=goalFor(sid,goalText);
        const activity=get(r,map,'activity')||goalText||get(r,map,'service_type')||'Imported session';
        const key=`${sid}|${date}|${start||''}|${normalize(activity)}`;
        return {row:i+2,student_name:full,student_id:sid,date,start_time:start,end_time:end,duration_minutes:duration??null,provider:get(r,map,'provider'),service_type:enumValue(get(r,map,'service_type'),'service'),delivery:enumValue(get(r,map,'delivery'),'delivery'),setting:enumValue(get(r,map,'setting'),'setting'),location:get(r,map,'location'),goal_text:goalText,goal_id:gid,activity,scheduled_minutes:scheduled??duration??null,delivered_minutes:delivered??duration??null,status:enumValue(get(r,map,'status'),'status'),correct,total,percentage:pct,quantitative_note:rawQuant,qualitative:get(r,map,'qualitative'),follow_up_note:get(r,map,'follow_up_note'),duplicate:sid&&date?duplicateKeys.has(key):false};
      }).filter(r=>r.student_name||r.date||r.activity);
      setRows(parsed); setFileName(file.name);
    }catch(e){toast({title:'Could not read session file',description:e.message,variant:'destructive'});}
    finally{setBusy(false); if(inputRef.current)inputRef.current.value='';}
  };

  const patchRow=(idx,patch)=>setRows(v=>v.map((r,i)=>i===idx?{...r,...patch}:r));
  const ready=rows.filter(r=>r.student_id&&r.date&&!r.duplicate);
  const issues=rows.length-ready.length;

  const doImport=async()=>{
    if(!ready.length)return; setBusy(true);
    try{
      const sessionRecords=ready.map(r=>({student_id:r.student_id,date:r.date,start_time:r.start_time||undefined,end_time:r.end_time||undefined,duration_minutes:r.duration_minutes??undefined,provider:r.provider||undefined,service_type:r.service_type,delivery:r.delivery,setting:r.setting,location:r.location||undefined,goal_id:r.goal_id||undefined,activity:r.activity,scheduled_minutes:r.scheduled_minutes??undefined,delivered_minutes:r.delivered_minutes??undefined,status:r.status,quantitative:(r.correct!=null||r.total!=null||r.percentage!=null||r.quantitative_note)?{correct:r.correct,total:r.total,percentage:r.percentage,raw:r.quantitative_note||undefined}:undefined,qualitative:r.qualitative||undefined,follow_up_needed:!!r.follow_up_note,follow_up_note:r.follow_up_note||undefined,tags:['Imported spreadsheet']}));
      await base44.entities.SessionRecord.bulkCreate(sessionRecords);
      const progressRecords=ready.filter(r=>r.goal_id&&(r.correct!=null||r.total!=null||r.percentage!=null||r.qualitative)).map(r=>({student_id:r.student_id,goal_id:r.goal_id,date:r.date,correct:r.correct??undefined,total:r.total??undefined,percentage:r.percentage??undefined,decimal:r.percentage!=null?Math.round((r.percentage/100)*100)/100:undefined,qualitative_notes:r.qualitative||undefined,observation_notes:r.qualitative||undefined,prompting_level:'independent'}));
      if(progressRecords.length) await base44.entities.ProgressData.bulkCreate(progressRecords);
      setSummary({sessions:sessionRecords.length,progress:progressRecords.length,skipped:rows.length-ready.length}); setRows([]); if(onImported) await onImported();
      toast({title:'Session import complete',description:`${sessionRecords.length} sessions imported${progressRecords.length?` and ${progressRecords.length} progress points created`:''}.`});
    }catch(e){toast({title:'Import failed',description:e.message,variant:'destructive'});} finally{setBusy(false);}
  };

  return <div className="space-y-4">
    <Card className="p-6 border-sky-100 bg-gradient-to-br from-white to-sky-50/50">
      <div className="flex gap-4"><div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"><FileSpreadsheet className="h-6 w-6"/></div><div><h3 className="font-black text-lg">Import session tracking spreadsheet</h3><p className="text-sm text-slate-600 mt-1 max-w-2xl">Upload or drag in Excel/CSV. CaseCue matches students, reads dates, service minutes, service area, quantitative data and narrative notes, previews every row, skips duplicates, then creates session records after you approve.</p><div className="flex items-center gap-2 mt-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600"/>Nothing is saved until you review and approve the import.</div></div></div>
      <div className="mt-5"><input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={e=>parseFile(e.target.files?.[0])}/><div onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('border-blue-500')}} onDragLeave={e=>e.currentTarget.classList.remove('border-blue-500')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('border-blue-500');parseFile(e.dataTransfer.files?.[0])}} onClick={()=>inputRef.current?.click()} className="cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-white p-7 text-center transition-colors hover:border-blue-500"><Upload className="h-7 w-7 mx-auto text-blue-700"/><div className="font-black mt-2">Drag & drop your session tracking file here</div><div className="text-sm text-slate-500 mt-1">or click to browse · Excel (.xlsx) or CSV · up to 5 MB</div><Button type="button" className="mt-3 bg-slate-950 hover:bg-slate-800 text-white" disabled={busy}>{busy?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<Upload className="h-4 w-4 mr-2"/>}{busy?'Reading file…':'Choose Excel / CSV'}</Button></div></div>
      {summary&&<div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="font-black flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>Import complete</div><div className="mt-1">{summary.sessions} sessions · {summary.progress} goal progress points · {summary.skipped} rows skipped/reviewed</div></div>}
    </Card>

    {rows.length>0&&<Card className="overflow-hidden"><div className="px-5 py-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><div className="font-black">Review import — {fileName}</div><div className="text-sm text-slate-500">{ready.length} ready · {issues} need review or will be skipped</div></div><Button onClick={doImport} disabled={busy||!ready.length} className="bg-blue-700 hover:bg-blue-800 text-white">Approve & Import {ready.length} Sessions</Button></div><div className="overflow-x-auto max-h-[560px]"><table className="w-full text-sm min-w-[1100px]"><thead className="sticky top-0 bg-slate-50 border-b"><tr className="text-left text-xs text-slate-500"><th className="px-4 py-3">Row</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Minutes</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Goal</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{rows.map((r,i)=><tr key={`${r.row}-${i}`} className={r.duplicate?'bg-amber-50/60':!r.student_id||!r.date?'bg-rose-50/50':''}><td className="px-4 py-3 align-top">{r.row}{r.duplicate&&<div className="text-[10px] text-amber-700 font-bold mt-1">Duplicate</div>}</td><td className="px-4 py-3 align-top w-56"><Select value={r.student_id||undefined} onValueChange={sid=>patchRow(i,{student_id:sid,goal_id:goalFor(sid,r.goal_text)})}><SelectTrigger className={!r.student_id?'border-rose-300 bg-white':''}><SelectValue placeholder={r.student_name||'Match student'}/></SelectTrigger><SelectContent>{students.map(s=><SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent></Select>{!r.student_id&&<div className="text-[10px] text-rose-600 mt-1">Student match required</div>}</td><td className="px-4 py-3 align-top">{r.date||<span className="text-rose-600">Missing</span>}<div className="text-xs text-slate-400">{r.start_time}{r.end_time?`–${r.end_time}`:''}</div></td><td className="px-4 py-3 align-top">{r.delivered_minutes??r.duration_minutes??'—'}</td><td className="px-4 py-3 align-top max-w-[220px]"><div className="font-medium">{r.activity}</div><div className="text-xs text-slate-400">{r.qualitative}</div></td><td className="px-4 py-3 align-top w-52"><Select value={r.goal_id||'none'} onValueChange={gid=>patchRow(i,{goal_id:gid==='none'?'':gid})}><SelectTrigger><SelectValue placeholder="Not goal-linked"/></SelectTrigger><SelectContent><SelectItem value="none">Not goal-linked</SelectItem>{goals.filter(g=>g.student_id===r.student_id).map(g=><SelectItem key={g.id} value={g.id}>{g.goal_area||'Goal'}</SelectItem>)}</SelectContent></Select></td><td className="px-4 py-3 align-top">{r.correct!=null||r.total!=null?`${r.correct??'—'}/${r.total??'—'}`:r.percentage!=null?`${Math.round(r.percentage*10)/10}%`:'—'}</td><td className="px-4 py-3 align-top">{r.status}</td></tr>)}</tbody></table></div><div className="px-5 py-3 border-t bg-slate-50 text-xs text-slate-500 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/>Rows with no student/date or detected duplicates are not imported. Goal-linked scores also create ProgressData so existing graphs update automatically.</div></Card>}
  </div>;
}
