import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const checks=[];
const fail=[];
const ok=(name,condition,detail='')=>{checks.push(name);if(!condition)fail.push(detail?name+': '+detail:name)};

const app=read('src/App.jsx');
const caps=read('src/lib/workspaceCapabilities.js');
const paraBaseline=read('src/pages/ParaBaseline.jsx');
const workspaceNotes=read('src/pages/WorkspaceNotes.jsx');
const nowBar=read('src/components/WorkspaceNowBar.jsx');
const scheduleExport=read('src/components/schedule/ScheduleExportPanel.jsx');
const docExport=read('src/lib/docExport.js');
const ot=read('src/pages/OTHome.jsx');
const nurse=read('src/pages/NurseHome.jsx');
const speech=read('src/pages/SpeechHome.jsx');
const speechIep=read('src/pages/SpeechIEP.jsx');
const paraBaselinePrint=read('src/lib/paraBaselinePrint.js');
const paraBaselineDraft=read('base44/functions/draftParaBaselinePacket/entry.ts');
const studentNotes=read('src/components/notes/StudentNotesPanel.jsx');
const quickNote=read('src/components/notes/QuickNoteDialog.jsx');
const exportBar=read('src/components/shared/ExportBar.jsx');

const concreteHomes=['para','speech','ot','substitute','pe','nurse'];
for(const key of concreteHomes){
  ok('concrete home '+key,new RegExp('path="\\/w\\/'+key+'"').test(app),'missing concrete /w/'+key+' route');
}
for(const generic of ['/w/:workspace/schedule','/w/:workspace/attendance','/w/:workspace/notes']){
  ok('generic route '+generic,app.includes('path="'+generic+'"'),'missing '+generic);
}

const requiredNav=[
 '/w/para/schedule','/w/para/attendance','/w/para/students','/w/para/grade','/w/para/baseline','/w/para/iep-guide','/w/para/notes',
 '/w/speech/schedule','/w/speech/attendance','/w/speech/iep','/w/speech/notes',
 '/w/ot/schedule','/w/ot/attendance','/w/ot/notes',
 '/w/substitute/schedule','/w/substitute/attendance','/w/substitute/lesson','/w/substitute/grade','/w/substitute/notes',
 '/w/pe/schedule','/w/pe/attendance','/w/pe/lesson','/w/pe/grade','/w/pe/notes'
];
for(const path of requiredNav)ok('nav registered '+path,caps.includes("'"+path+"'")||caps.includes('"'+path+'"'),'missing workspace nav path');

for(const [label,text] of [['OT',ot],['Nurse',nurse],['Speech',speech]]){
  ok(label+' avoids browser-only record storage',!text.includes('localStorage'),'role records must not use localStorage');
}
ok('OT persists SessionRecord',ot.includes("entities.SessionRecord.create"),'OT session persistence missing');
ok('Nurse persists NurseRecord',nurse.includes("entities.NurseRecord.create"),'Nurse record persistence missing');
ok('Speech persists SpeechSession',speech.includes("entities.SpeechSession.create"),'Speech session persistence missing');

ok('Para baseline supports drop',paraBaseline.includes('onDrop=')&&paraBaseline.includes('chooseFile'),'baseline drop zone missing');
ok('Para baseline student sheet uses branded document print',paraBaseline.includes("printDoc(")&&!paraBaseline.includes('window.print()'),'raw browser print still present');
ok('Para teacher packet uses premium dedicated print',paraBaseline.includes('printParaBaselinePacket')&&paraBaselinePrint.includes('Baseline Teacher Packet'),'premium baseline packet print missing');
ok('Para teacher packet includes accommodation considerations',paraBaseline.includes('Supports & Accommodation Considerations')&&paraBaselineDraft.includes('support_recommendations'),'assessment-linked support section missing');
ok('Para packet can rebuild without rescanning',paraBaseline.includes('rebuildPacket')&&paraBaseline.includes('Rebuild Packet'),'packet rebuild path missing');
ok('Workspace notes supports AI cleanup',workspaceNotes.includes("askCaseCue")&&workspaceNotes.includes('Clean Up with CaseCue'),'AI note cleanup missing');
ok('Workspace notes supports drag/drop attachments',workspaceNotes.includes('onDrop=')&&workspaceNotes.includes('UploadPrivateFile'),'note drop attachment missing');
ok('Workspace notes supports premium exports',workspaceNotes.includes('ExportBar'),'note export bar missing');
ok('Shared workspace notes can edit saved notes',workspaceNotes.includes('editingId')&&workspaceNotes.includes('WorkspaceNote.update')&&workspaceNotes.includes('Edit note'),'shared note editing missing');
ok('SPED student notes can edit saved notes',studentNotes.includes('editingNote')&&quickNote.includes('StudentNote.update')&&quickNote.includes('Edit Student Note'),'SPED student note editing missing');
ok('SPED student notes use shared export bar',studentNotes.includes('ExportBar'),'SPED notes are not using shared export behavior');
ok('Shared workspace timer mounted',nowBar.includes('WorkspaceTimer'),'shared timer missing');

ok('Schedule export is role-aware',scheduleExport.includes('workspaceKey')&&scheduleExport.includes('workspaceLabel'),'schedule export not role-aware');
ok('Schedule export no hardcoded SPED promo',!scheduleExport.includes('Created with CaseCue · Special Education Workspace'),'hardcoded SPED export branding returned');
ok('Print HTML carries CaseCue footer',docExport.includes('CaseCue · getcasecue.com'),'premium footer missing');
ok('Print header is simplified',!docExport.includes('CaseCue Record')&&!docExport.includes('page-number')&&docExport.includes('Printed'),'old decorative print badge or Page 0 logic returned');
ok('Direct PDF is first-class export',exportBar.includes('Download PDF')&&docExport.includes('Page ${p} of ${pages}'),'direct premium PDF export missing');

ok('Speech IEP queries selected student docs',speechIep.includes("Document.filter({student_id:form.student_id}")&&!speechIep.includes('Document.list('),'Speech IEP must not pre-load every org document');

for(const entity of ['IepDraftArtifact','IepDraftSourceLink','IepDraftReviewState']){
 const schema=read('base44/entities/'+entity+'.jsonc');
 ok(entity+' is organization scoped',schema.includes('organization_id')&&schema.includes('"rls"')&&schema.includes('{{user.data.organization_id}}'),'IEP helper entity is not organization scoped');
}

const prohibitedVisible=['Smart Grader V2 · Separate → Resolve → Grade → Submit for Teacher Review'];
for(const text of prohibitedVisible)ok('Para hides developer grader wording',!paraBaseline.includes(text)&&!read('src/components/gradebook/SmartGraderV2.jsx').includes(text),'developer-facing grader wording visible');

if(fail.length){
 console.error('Workspace production regression checks: FAIL');
 for(const f of fail)console.error(' - '+f);
 process.exit(1);
}
console.log('Workspace production regression checks: PASS ('+checks.length+' checks)');
