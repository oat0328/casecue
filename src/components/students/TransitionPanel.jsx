import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const EMPTY={interests:"",strengths:"",education_goal:"",employment_goal:"",independent_living_goal:"",assessment_summary:"",student_voice:"",activities:"",agency_participation:"",status:"draft"};
export default function TransitionPanel({student}){
  const {toast}=useToast(); const {data:rows,refetch}=useAsync(()=>base44.entities.TransitionPlan.filter({student_id:student.id},'-updated_date',5),[student.id]);
  const current=(rows||[])[0]||null; const [form,setForm]=useState(EMPTY); const [saving,setSaving]=useState(false);
  useEffect(()=>{setForm(current?{...EMPTY,...current}:EMPTY)},[current?.id]);
  const save=async()=>{setSaving(true);try{if(current)await base44.entities.TransitionPlan.update(current.id,form);else await base44.entities.TransitionPlan.create({...form,student_id:student.id});refetch();toast({title:"Transition plan saved",description:"Keep student voice and assessment evidence current as the team reviews the plan."});}catch(e){toast({title:"Could not save transition plan",description:e.message,variant:"destructive"})}finally{setSaving(false)}};
  const field=(key,label,placeholder,rows=3)=><div><Label>{label}</Label><Textarea rows={rows} value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={placeholder}/></div>;
  return <Card className="p-6"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><h3 className="font-black text-lg">Transition Planning Studio</h3><p className="text-sm text-slate-500 mt-1 max-w-2xl">Organize transition assessment findings, student voice, postsecondary goals, activities, and agency participation. CaseCue records the team’s work; it does not independently determine transition services.</p></div><div className="w-40"><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="review">Team review</SelectItem><SelectItem value="active">Active</SelectItem></SelectContent></Select></div></div><div className="grid lg:grid-cols-2 gap-5 mt-6">{field('interests','Interests & preferences','Student interests, preferences, motivators…')}{field('strengths','Transition strengths','Skills and strengths relevant to adult outcomes…')}{field('assessment_summary','Transition assessment summary','Summarize verified transition assessment information…')}{field('student_voice','Student voice','What the student says they want for education, employment, living, community…')}{field('education_goal','Education / training goal','Postsecondary education or training goal…')}{field('employment_goal','Employment goal','Postsecondary employment goal…')}{field('independent_living_goal','Independent living goal','If appropriate based on assessment…')}{field('activities','Transition activities','Courses, instruction, experiences, responsibilities, timelines…')}{field('agency_participation','Agency participation','Outside agencies/partners and consent/participation notes…')}</div><Button onClick={save} disabled={saving} className="mt-5 bg-blue-700 hover:bg-blue-800 text-white"><Save className="h-4 w-4 mr-1"/>{saving?"Saving…":"Save transition plan"}</Button></Card>;
}
