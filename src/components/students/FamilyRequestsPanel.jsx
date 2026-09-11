import React from 'react';
import { Inbox, CheckCircle2, MessageCircleQuestion, CalendarClock, BookOpen, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/lib/useAsync';
import { Card } from '@/components/ui/cards';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const LABELS={acknowledgment:'Acknowledgment',question:'Question',meeting_request:'Meeting request',resource_request:'Resource request',update_request:'Update request'};
const ICONS={acknowledgment:CheckCircle2,question:MessageCircleQuestion,meeting_request:CalendarClock,resource_request:BookOpen,update_request:RefreshCw};

export default function FamilyRequestsPanel({student}){
  const {toast}=useToast();
  const {data:rows,refetch}=useAsync(()=>base44.entities.FamilyRequest.filter({student_id:student.id},'-submitted_at',100),[student.id]);
  const update=async(r,status)=>{try{await base44.entities.FamilyRequest.update(r.id,{status,resolved_at:status==='resolved'?new Date().toISOString():undefined});await refetch();toast({title:status==='resolved'?'Family request resolved':'Family request updated'});}catch(e){toast({title:'Could not update request',description:e.message,variant:'destructive'});}};
  const open=(rows||[]).filter(r=>r.status!=='resolved');
  return <Card className="p-6 mt-5"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><Inbox className="h-5 w-5"/></div><div><h3 className="font-black text-lg">Family acknowledgments & requests</h3><p className="text-sm text-slate-500 mt-1">Messages submitted through this student's secure Family View appear here for educator follow-up.</p></div></div><span className="rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs font-black">{open.length} open</span></div><div className="mt-5 space-y-2">{(rows||[]).map(r=>{const Icon=ICONS[r.request_type]||MessageCircleQuestion;return <div key={r.id} className={`rounded-2xl border p-4 ${r.status==='resolved'?'bg-slate-50 opacity-70':'bg-white'}`}><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div className="flex gap-3"><div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"><Icon className="h-4 w-4"/></div><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">{LABELS[r.request_type]||r.request_type}</div><div className="text-xs text-slate-400 mt-0.5">{r.submitted_at?new Date(r.submitted_at).toLocaleString():'Submitted through Family View'}</div><div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{r.message||'Family acknowledged reviewing the shared update.'}</div></div></div><div className="flex gap-2 shrink-0">{r.status==='new'&&<Button size="sm" variant="outline" onClick={()=>update(r,'reviewed')}>Mark reviewed</Button>}{r.status!=='resolved'&&<Button size="sm" onClick={()=>update(r,'resolved')}>Resolve</Button>}{r.status==='resolved'&&<span className="text-xs font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/>Resolved</span>}</div></div></div>})}{!(rows||[]).length&&<div className="py-7 text-center text-sm text-slate-500">No Family View requests or acknowledgments yet.</div>}</div></Card>;
}
