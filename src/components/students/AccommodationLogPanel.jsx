import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const STATUSES=[['offered','Offered'],['used','Used'],['declined','Declined'],['not_applicable','Not applicable'],['unable_to_provide','Unable to provide']];
export default function AccommodationLogPanel({student}){
  const {toast}=useToast();
  const {data:items,refetch}=useAsync(()=>base44.entities.AccommodationLog.filter({student_id:student.id},'-date',200),[student.id]);
  const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),accommodation:"",status:"used",context:"",effectiveness:"",notes:""});const [saving,setSaving]=useState(false);
  const add=async()=>{if(!form.accommodation.trim())return;setSaving(true);try{await base44.entities.AccommodationLog.create({...form,student_id:student.id});setForm({...form,accommodation:"",context:"",effectiveness:"",notes:""});refetch();toast({title:"Accommodation implementation logged"});}catch(e){toast({title:"Could not save",description:e.message,variant:"destructive"})}finally{setSaving(false)}};
  const remove=async id=>{await base44.entities.AccommodationLog.delete(id);refetch();};
  return <div className="space-y-4"><Card className="p-6"><h3 className="font-black text-lg">Accommodation implementation log</h3><p className="text-sm text-slate-500 mt-1">Document whether an accommodation was offered, used, declined, not applicable, or unable to be provided. This is implementation evidence—not a legal conclusion.</p><div className="grid md:grid-cols-2 gap-4 mt-5"><div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><div><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STATUSES.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div className="md:col-span-2"><Label>Accommodation *</Label><Input value={form.accommodation} onChange={e=>setForm({...form,accommodation:e.target.value})} placeholder="e.g. Small-group testing"/></div><div><Label>Context</Label><Input value={form.context} onChange={e=>setForm({...form,context:e.target.value})} placeholder="Math quiz, reading group…"/></div><div><Label>Effectiveness / student response</Label><Input value={form.effectiveness} onChange={e=>setForm({...form,effectiveness:e.target.value})}/></div><div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div></div><Button onClick={add} disabled={saving||!form.accommodation.trim()} className="mt-4 bg-blue-700 hover:bg-blue-800 text-white"><Plus className="h-4 w-4 mr-1"/>{saving?"Saving…":"Log implementation"}</Button></Card><div className="space-y-2">{(items||[]).map(x=><Card key={x.id} className="p-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-semibold">{x.accommodation}</span><span className="text-[11px] rounded-full bg-slate-100 px-2 py-1 font-bold">{STATUSES.find(s=>s[0]===x.status)?.[1]||x.status}</span></div><div className="text-xs text-slate-500 mt-1">{x.date}{x.context?` · ${x.context}`:''}</div>{x.effectiveness&&<div className="text-sm mt-2">Response: {x.effectiveness}</div>}{x.notes&&<div className="text-xs text-slate-500 mt-1">{x.notes}</div>}</div><Button variant="ghost" size="icon" onClick={()=>remove(x.id)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></Card>)}{!(items||[]).length&&<Card className="p-8 text-center text-sm text-slate-500">No accommodation implementation entries yet.</Card>}</div></div>;
}
