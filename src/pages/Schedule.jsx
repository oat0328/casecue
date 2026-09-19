import React,{useState}from'react';
import{CalendarClock,Upload,Sparkles,Plus,UserPlus,Trash2}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{Card}from'@/components/ui/cards';
import PageHeader from'@/components/PageHeader';
import{Button}from'@/components/ui/button';
import{Tabs,TabsList,TabsTrigger,TabsContent}from'@/components/ui/tabs';
import{useToast}from'@/components/ui/use-toast';
import UploadScheduleDialog from'@/components/schedule/UploadScheduleDialog';
import AddGroupDialog from'@/components/schedule/AddGroupDialog';
import AddStudentDialog from'@/components/schedule/AddStudentDialog';
import EditEntryDialog from'@/components/schedule/EditEntryDialog';
import GroupsTab from'@/components/schedule/GroupsTab';
import MinutesPanel from'@/components/schedule/MinutesPanel';
import ScheduleExportPanel from'@/components/schedule/ScheduleExportPanel';
import OptimizeDialog from'@/components/schedule/OptimizeDialog';
import ScheduleAlertsPanel from'@/components/schedule/ScheduleAlertsPanel';
import WeeklyScheduleBoard from'@/components/schedule/WeeklyScheduleBoard';
export default function Schedule(){
 const workspaceKey='sped';const{toast}=useToast();const{data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',200),[]);const{data:goals}=useAsync(()=>base44.entities.Goal.list('-created_date',1000),[]);const{data:sessionLogs}=useAsync(()=>base44.entities.SessionLog.list('-date',500),[]);const{data:allEntries,refetch}=useAsync(()=>base44.entities.ScheduleEntry.list('-day',500),[]);const entries=(allEntries||[]).filter(e=>(e.workspace||'sped')===workspaceKey);const[dialog,setDialog]=useState(null),[optimizeOpen,setOptimizeOpen]=useState(false),[editing,setEditing]=useState(null);const timeFormat='12h';const active=entries.filter(e=>!e.archived);
 const clearSchedule=async()=>{if(!active.length||!window.confirm(`Clear the current schedule? This archives ${active.length} blocks so you can replace it.`))return;try{await Promise.all(active.map(e=>base44.entities.ScheduleEntry.update(e.id,{archived:true})));await refetch();toast({title:'Schedule cleared',description:'Previous blocks were archived.'})}catch(e){toast({title:'Could not clear schedule',description:e.message,variant:'destructive'})}};
 const remove=async entry=>{try{await base44.entities.ScheduleEntry.delete(entry.id);refetch();toast({title:'Schedule block deleted'})}catch(e){toast({title:'Delete failed',description:e.message,variant:'destructive'})}};
 return <div><PageHeader title='Instruction & Schedule' subtitle='Bell schedule + student schedules + IEP goals → clean groups, daily instruction, minutes, and alerts.' icon={CalendarClock} actions={<><Button onClick={()=>setDialog('upload')} className='brand-gradient text-white'><Upload className='h-4 w-4'/>Build My Schedule</Button><Button variant='outline' onClick={()=>setOptimizeOpen(true)}><Sparkles className='h-4 w-4 text-primary'/>Optimize Groups</Button><Button variant='outline' onClick={()=>setDialog('group')}><Plus className='h-4 w-4'/>Add Group</Button><Button variant='outline' onClick={()=>setDialog('student')}><UserPlus className='h-4 w-4'/>Add Student</Button><Button variant='outline' onClick={clearSchedule} className='border-rose-300 text-rose-700'><Trash2 className='h-4 w-4'/>Clear / Replace</Button></>} />
 <ScheduleAlertsPanel students={students||[]} entries={entries||[]} goals={goals||[]} onRefresh={refetch}/>
 <Tabs defaultValue='weekly' className='w-full mt-6'><TabsList className='mb-4'><TabsTrigger value='weekly'>Daily / Weekly Schedule</TabsTrigger><TabsTrigger value='groups'>IEP Goal Groups</TabsTrigger><TabsTrigger value='minutes'>Minutes & Planning</TabsTrigger></TabsList><TabsContent value='weekly' className='space-y-6'>{active.length===0&&<Card className='p-8 text-center'><CalendarClock className='h-10 w-10 text-primary mx-auto'/><p className='font-semibold mt-3'>Build your SPED schedule</p><p className='text-sm text-muted-foreground mt-1 max-w-xl mx-auto'>Upload the school bell schedule and student/SPED schedules together. CaseCue can use rules such as “last 30 minutes of class,” group students by IEP goal area, and flag problems before you publish the plan.</p><Button onClick={()=>setDialog('upload')} className='brand-gradient text-white mt-4'><Upload className='h-4 w-4'/>Build My Schedule</Button></Card>}
 <WeeklyScheduleBoard entries={entries} students={students||[]} timeFormat={timeFormat} onEdit={setEditing} onDelete={remove} showPullSource/><ScheduleExportPanel entries={entries} students={students||[]} timeFormat={timeFormat}/></TabsContent><TabsContent value='groups'><GroupsTab entries={entries||[]} students={students||[]} onRefresh={refetch}/></TabsContent><TabsContent value='minutes'><MinutesPanel students={students||[]} entries={entries||[]} sessionLogs={sessionLogs||[]}/></TabsContent></Tabs>
 <UploadScheduleDialog workspaceKey={workspaceKey} open={dialog==='upload'} onOpenChange={o=>setDialog(o?'upload':null)} students={students||[]} onSaved={refetch}/><AddGroupDialog workspaceKey={workspaceKey} open={dialog==='group'} onOpenChange={o=>setDialog(o?'group':null)} students={students||[]} onSaved={refetch}/><AddStudentDialog workspaceKey={workspaceKey} open={dialog==='student'} onOpenChange={o=>setDialog(o?'student':null)} students={students||[]} entries={entries} onSaved={refetch}/><OptimizeDialog open={optimizeOpen} onOpenChange={setOptimizeOpen}/>{editing&&<EditEntryDialog entry={editing} students={students||[]} onClose={()=>setEditing(null)} onSaved={refetch}/>}</div>;
}
