import React,{useEffect}from'react';
import{base44}from'@/api/base44Client';
import{getPhoneAlertPrefs,oncePerDay,showCaseCueNotification}from'@/lib/phoneAlerts';

const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const mins=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null};
export default function PhoneAlertRunner(){
 useEffect(()=>{
  let stopped=false,cache=null,lastLoad=0;
  const load=async()=>{
   if(cache&&Date.now()-lastLoad<15*60*1000)return cache;
   const [schedule,meetings,lessons,students,goals,progress]=await Promise.all([
    base44.entities.ScheduleEntry.list('-day',500).catch(()=>[]),
    base44.entities.Meeting.filter({status:'scheduled'},'date',100).catch(()=>[]),
    base44.entities.Lesson.list('-date',400).catch(()=>[]),
    base44.entities.Student.list('-updated_date',300).catch(()=>[]),
    base44.entities.Goal.list('-updated_date',500).catch(()=>[]),
    base44.entities.ProgressData.list('-date',800).catch(()=>[]),
   ]);cache={schedule,meetings,lessons,students,goals,progress};lastLoad=Date.now();return cache;
  };
  const tick=async()=>{
   if(stopped)return;const prefs=getPhoneAlertPrefs();if(!prefs.enabled||typeof Notification==='undefined'||Notification.permission!=='granted')return;
   const data=await load();const now=new Date(),todayISO=iso(now),todayName=DAYS[now.getDay()],nowMin=now.getHours()*60+now.getMinutes();
   if(prefs.group_reminders){for(const e of (data.schedule||[]).filter(x=>!x.archived&&x.day===todayName)){const start=mins(e.start_time);if(start===null)continue;const diff=start-nowMin;if(diff>=0&&diff<=Number(prefs.lead_minutes||15)&&oncePerDay(`group-${e.id}-${todayISO}`)){await showCaseCueNotification(`CaseCue: ${e.group_name} in ${diff||'a few'} min`,`${(e.student_ids||[]).length} student${(e.student_ids||[]).length===1?'':'s'} · ${e.service_minutes||''} min${e.teacher_classroom?` · ${e.teacher_classroom}`:''}`,'/schedule',`group-${e.id}`);}}
   }
   if(prefs.meeting_reminders){for(const m of data.meetings||[]){if(m.date!==todayISO)continue;const start=mins(m.time);if(start===null)continue;const diff=start-nowMin;if(diff>=0&&diff<=30&&oncePerDay(`meeting-${m.id}-${todayISO}`)){await showCaseCueNotification('CaseCue meeting reminder',`${m.title||m.meeting_type||'IEP / MET meeting'} starts in ${diff||'a few'} min`,'/meetings',`meeting-${m.id}`);}}
   }
   if(prefs.tomorrow_ready&&now.getHours()>=18){const t=new Date(now);t.setDate(t.getDate()+1);const tomorrowISO=iso(t),tomorrowName=DAYS[t.getDay()];const groups=(data.schedule||[]).filter(e=>!e.archived&&e.day===tomorrowName&&!String(e.notes||'').includes('NON-INSTRUCTIONAL / UNAVAILABLE'));const ids=new Set(groups.flatMap(g=>g.student_ids||[]));const ready=(data.lessons||[]).filter(l=>l.date===tomorrowISO).length;if(groups.length&&oncePerDay(`tomorrow-ready-${tomorrowISO}`)){await showCaseCueNotification(`Tomorrow Ready: ${groups.length} groups`,`${ids.size} students · ${ready} lesson${ready===1?'':'s'} ready. Tap to see tomorrow.`,'/schedule',`tomorrow-${tomorrowISO}`);}}
   if(prefs.progress_reminders&&now.getHours()>=16){const active=(data.students||[]).filter(s=>(s.roster_status||s.status||'active')==='active');const monitored=new Set((data.progress||[]).filter(p=>{const d=String(p.date||'');return d>=todayISO;}).map(p=>p.student_id));const missing=active.filter(s=>!monitored.has(s.id)).length;if(missing>0&&oncePerDay(`progress-${todayISO}`)){await showCaseCueNotification('CaseCue progress check',`${missing} active student${missing===1?'':'s'} have no progress data logged today.`,'/progress-monitoring-day','progress-daily');}}
  };
  tick();const id=setInterval(tick,60000);return()=>{stopped=true;clearInterval(id)};
 },[]);
 return null;
}