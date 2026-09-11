import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function ModificationsPanel({student}){
  const {toast}=useToast();
  const {data:items,refetch}=useAsync(()=>base44.entities.Modification.filter({student_id:student.id},'-updated_date',100),[student.id]);
  const [form,setForm]=useState({area:"",modification:"",setting:"",frequency:"",notes:""}); const [saving,setSaving]=useState(false);
  const add=async()=>{if(!form.modification.trim())return;setSaving(true);try{await base44.entities.Modification.create({...form,student_id:student.id,active:true});setForm({area:"",modification:"",setting:"",frequency:"",notes:""});refetch();toast({title:"Modification added"});}catch(e){toast({title:"Could not add modification",description:e.message,variant:"destructive"})}finally{setSaving(false)}};
  const remove=async(id)=>{await base44.entities.Modification.delete(id);refetch();};
  return <div className="space-y-4"><Card className="p-6"><h3 className="font-black text-lg">Modifications</h3><p className="text-sm text-slate-500 mt-1">Keep modifications separate from accommodations so changes to what a student is expected to learn or demonstrate are clearly documented.</p><div className="grid md:grid-cols-2 gap-4 mt-5"><div><Label>Area</Label><Input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} placeholder="Reading, Math, Writing…"/></div><div><Label>Setting</Label><Input value={form.setting} onChange={e=>setForm({...form,setting:e.target.value})} placeholder="Resource, General Ed…"/></div><div className="md:col-span-2"><Label>Modification *</Label><Textarea value={form.modification} onChange={e=>setForm({...form,modification:e.target.value})} rows={2}/></div><div><Label>Frequency</Label><Input value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} placeholder="As needed, daily…"/></div><div><Label>Notes</Label><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div></div><Button onClick={add} disabled={saving||!form.modification.trim()} className="mt-4 bg-blue-700 hover:bg-blue-800 text-white"><Plus className="h-4 w-4 mr-1"/>{saving?"Saving…":"Add modification"}</Button></Card><div className="space-y-2">{(items||[]).map(x=><Card key={x.id} className="p-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">{x.area||"General"}</div><div className="font-semibold mt-1">{x.modification}</div><div className="text-xs text-slate-500 mt-1">{[x.setting,x.frequency,x.notes].filter(Boolean).join(" · ")}</div></div><Button variant="ghost" size="icon" onClick={()=>remove(x.id)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></Card>)}{!(items||[]).length&&<Card className="p-8 text-center text-sm text-slate-500">No modifications recorded.</Card>}</div></div>;
}
