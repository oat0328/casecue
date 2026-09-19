import React,{useMemo,useState}from'react';
import{Navigate,useParams}from'react-router-dom';
import{CalendarClock,Plus,Trash2,Upload}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{useToast}from'@/components/ui/use-toast';
import{WORKSPACES,getActiveWorkspace,getUserWorkspaces,workspaceHome}from'@/lib/workspaces';
import PageHeader from'@/components/PageHeader';
import{Button}from'@/components/ui/button';
import{Card}from'@/components/ui/cards';
import WeeklyScheduleBoard from'@/components/schedule/WeeklyScheduleBoard';
import ScheduleExportPanel from'@/components/schedule/ScheduleExportPanel';
import AddGroupDialog from'@/components/schedule/AddGroupDialog';
import EditEntryDialog from'@/components/schedule/EditEntryDialog';
import ParaScheduleUploadDialog from'@/components/schedule/ParaScheduleUploadDialog';

const COPY={
 gen_ed:['Class Schedule','Classes, groups, student blocks, and instructional time in one weekly view.'],
 para:['Support Schedule','Your assigned support blocks and students in one weekly view.'],
 speech:['Speech Schedule','Speech sessions, groups, locations, and students in one weekly view.'],
 ot:['OT Schedule','OT sessions, service blocks, locations, and students in one weekly view.'],
 nurse:['Nurse Schedule','Screening, clinic, follow-up, and school health blocks in one weekly view.'],
 psych:['Psych Schedule','Evaluation, testing, observation, meeting, and report-writing blocks in one weekly view.'],
 substitute:['Substitute Schedule','Your class periods, rooms, groups, and student blocks in one weekly view.'],
 pe:['PE Schedule','PE classes, grades, locations, and activity blocks in one weekly view.'],
};

export default function WorkspaceSchedule({workspaceKey:workspaceProp}){
 const params=useParams(),workspaceKey=workspaceProp||params.workspace;
 const{user}=useAuth(),{toast}=useToast();
 const para=workspaceKey==='para';
 const entityName=para?'ParaScheduleBlock':'ScheduleEntry';
 const{data:rawStudents}=useAsync(()=>para?base44.entities.ParaStudentAccess.list('-last_name',500):base44.entities.Student.list('-last_name',500),[workspaceKey]);
 const students=useMemo(()=>para?(rawStudents||[]).filter(s=>s.active!==false).map(s=>({...s,id:s.student_id})):(rawStudents||[]),[para,rawStudents]);
 const{data:rawEntries,refetch}=useAsync(()=>base44.entities[entityName].list('-day',800),[workspaceKey,entityName]);
 const entries=useMemo(()=>para?(rawEntries||[]):(rawEntries||[]).filter(e=>(e.workspace||'sped')===workspaceKey),[para,rawEntries,workspaceKey]);
 const active=entries.filter(e=>!e.archived&&e.active!==false);
 const[dialog,setDialog]=useState(null),[editing,setEditing]=useState(null);
 const meta=WORKSPACES[workspaceKey]||{short:'Workspace'};
 const[title,subtitle]=COPY[workspaceKey]||['Schedule',`${meta.short} schedule in one weekly view.`];
 const allowed=getUserWorkspaces(user),activeWorkspace=getActiveWorkspace(user);

 const remove=async entry=>{try{await base44.entities[entityName].delete(entry.id);await refetch();toast({title:'Schedule block deleted'})}catch(e){toast({title:'Delete failed',description:e.message,variant:'destructive'})}};
 const clear=async()=>{
  if(!active.length||!window.confirm(`Clear the current ${meta.short} schedule? This removes ${active.length} active blocks from the workspace view.`))return;
  try{
   if(para)await Promise.all(active.map(e=>base44.entities.ParaScheduleBlock.update(e.id,{active:false,updated_at:new Date().toISOString()})));
   else await Promise.all(active.map(e=>base44.entities.ScheduleEntry.update(e.id,{archived:true})));
   await refetch();toast({title:'Schedule cleared'});
  }catch(e){toast({title:'Could not clear schedule',description:e.message,variant:'destructive'})}
 };

 if(workspaceKey==='sped')return <Navigate to='/instruction/schedule' replace/>;
 if(!WORKSPACES[workspaceKey]||!allowed.includes(workspaceKey))return <Navigate to={workspaceHome(activeWorkspace)} replace/>;
 return <div className='space-y-6'>
  <PageHeader title={title} subtitle={subtitle} icon={CalendarClock} actions={<>
   {para&&<Button onClick={()=>setDialog('upload')} variant='outline'><Upload className='h-4 w-4'/>Upload Schedule</Button>}
   <Button onClick={()=>setDialog('add')} className='brand-gradient text-white'><Plus className='h-4 w-4'/>Add Block</Button>
   <Button variant='outline' onClick={clear} className='border-rose-300 text-rose-700'><Trash2 className='h-4 w-4'/>Clear / Replace</Button>
  </>}/>

  {active.length===0&&<Card className='p-8 text-center'>
   <CalendarClock className='h-10 w-10 text-primary mx-auto'/>
   <p className='font-semibold mt-3'>Build your {meta.short} schedule</p>
   <p className='text-sm text-muted-foreground mt-1 max-w-xl mx-auto'>Use the same CaseCue weekly schedule engine across workspaces. Add blocks here; role-specific tools remain separate while the schedule layout and behavior stay consistent.</p>
   <Button onClick={()=>setDialog('add')} className='brand-gradient text-white mt-4'><Plus className='h-4 w-4'/>Add First Block</Button>
  </Card>}

  <WeeklyScheduleBoard entries={entries} students={students} onEdit={setEditing} onDelete={remove}/>
  <ScheduleExportPanel entries={active} students={students} timeFormat='12h'/>

  <AddGroupDialog
   workspaceKey={workspaceKey}
   entityName={entityName}
   ownerUserId={user?.id||''}
   open={dialog==='add'}
   onOpenChange={o=>setDialog(o?'add':null)}
   students={students}
   onSaved={refetch}
  />
  {para&&<ParaScheduleUploadDialog open={dialog==='upload'} onOpenChange={o=>setDialog(o?'upload':null)} students={students} onSaved={refetch}/>}
  {editing&&<EditEntryDialog entry={editing} students={students} entityName={entityName} onClose={()=>setEditing(null)} onSaved={refetch}/>}
 </div>;
}
