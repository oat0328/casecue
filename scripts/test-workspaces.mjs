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
const paraSupport=read('src/pages/ParaIEPGuide.jsx');
const supportReader=read('base44/functions/processParaSupportDocument/entry.ts');
const premiumAnalytics=read('src/components/shared/PremiumAnalytics.jsx');
const analyticsExport=read('src/lib/analyticsExport.js');
const speechHome=read('src/pages/SpeechHome.jsx');
const otHome=read('src/pages/OTHome.jsx');
const peHome=read('src/pages/PEHome.jsx');
const subHome=read('src/pages/SubstituteHome.jsx');
const genEdHome=read('src/pages/GenEdHome.jsx');
const paraHome=read('src/pages/ParaHome.jsx');
const spedDataCenter=read('src/pages/DataCenter.jsx');
const weeklyFamily=read('src/pages/WeeklyFamilyUpdate.jsx');
const weeklyGenerator=read('base44/functions/generateWeeklyFamilyUpdate/entry.ts');
const weeklySchema=read('base44/entities/WeeklyFamilyUpdate.jsonc');
const userIdentity=read('src/lib/userIdentity.js');

const concreteHomes=['para','speech','ot','substitute','pe','nurse','psych','gen_ed'];
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
 '/w/pe/schedule','/w/pe/attendance','/w/pe/lesson','/w/pe/grade','/w/pe/notes',
 '/w/gen_ed/weekly-contact'
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
ok('Branded note exports use display name not email fallback',workspaceNotes.includes("userDisplayName(user,'CaseCue Staff')")&&!workspaceNotes.includes("user?.full_name||user?.email"),'workspace note export can expose account email');
ok('Shared user identity rejects email and email local-part as display name',userIdentity.includes("lower.includes('@')")&&userIdentity.includes('lower===local')&&userIdentity.includes('profile_display_name'),'display-name privacy guard missing');
ok('Shared workspace notes can edit saved notes',workspaceNotes.includes('editingId')&&workspaceNotes.includes('WorkspaceNote.update')&&workspaceNotes.includes('Edit note'),'shared note editing missing');
ok('SPED student notes can edit saved notes',studentNotes.includes('editingNote')&&quickNote.includes('StudentNote.update')&&quickNote.includes('Edit Student Note'),'SPED student note editing missing');
ok('SPED student notes use shared export bar',studentNotes.includes('ExportBar'),'SPED notes are not using shared export behavior');
ok('Shared workspace timer mounted',nowBar.includes('WorkspaceTimer'),'shared timer missing');

ok('Schedule export is role-aware',scheduleExport.includes('workspaceKey')&&scheduleExport.includes('workspaceLabel'),'schedule export not role-aware');
ok('Schedule export no hardcoded SPED promo',!scheduleExport.includes('Created with CaseCue · Special Education Workspace'),'hardcoded SPED export branding returned');
ok('Print HTML carries CaseCue footer',docExport.includes('CaseCue · getcasecue.com'),'premium footer missing');
ok('Print header is simplified',!docExport.includes('CaseCue Record')&&!docExport.includes('page-number')&&docExport.includes('Printed'),'old decorative print badge or Page 0 logic returned');
ok('Direct PDF is first-class export',exportBar.includes('Download PDF')&&docExport.includes('Page ${p} of ${pages}'),'direct premium PDF export missing');
ok('Para Student Supports accepts IEP/BIP/504/health uploads',paraSupport.includes('Drag & drop')&&paraSupport.includes('Health Plan')&&paraSupport.includes('BIP')&&paraSupport.includes('504'),'Para support document upload missing');
ok('Para support reader enforces assigned student',supportReader.includes('ParaStudentAccess.filter')&&supportReader.includes('not assigned to your Para account'),'Para support reader assignment check missing');
ok('Para support reader signs private file in user scope',supportReader.includes('base44.integrations.Core.CreateFileSignedUrl')&&!supportReader.includes('asServiceRole.integrations.Core.CreateFileSignedUrl'),'Para support reader must not service-sign an arbitrary client file URI');
ok('Para support reader separates eligibility from health condition',supportReader.includes('eligibility_categories')&&supportReader.includes('documented_disability_or_condition')&&supportReader.includes('health_safety_alerts'),'support extraction structure incomplete');
ok('Shared premium analytics component exists',premiumAnalytics.includes('PremiumLineChart')&&premiumAnalytics.includes('PremiumDonutChart')&&premiumAnalytics.includes('PremiumBarChart'),'premium analytics library incomplete');
ok('Analytics PDF draws graph data',analyticsExport.includes('drawBar')&&analyticsExport.includes('drawLine')&&analyticsExport.includes('Page ${p} of ${pages}'),'analytics PDF export missing graph rendering');
for(const [role,text] of [['Para',paraHome],['Speech',speechHome],['OT',otHome],['PE',peHome],['Substitute',subHome],['Gen Ed',genEdHome]])ok(role+' dashboard uses premium analytics',text.includes('Premium')&&text.includes('AnalyticsPdfButton'),role+' analytics not wired');
ok('SPED Data Center uses shared premium analytics',spedDataCenter.includes('PremiumLineChart')&&spedDataCenter.includes('PremiumDonutChart')&&spedDataCenter.includes('AnalyticsPdfButton'),'SPED premium analytics not wired');
ok('Para avoids raw browser prompts and handwritten print pages',!paraHome.includes('window.prompt(')&&!paraHome.includes('window.print(')&&paraHome.includes('AddGroupDialog')&&paraHome.includes('ExportBar'),'Para raw prompt/print regression returned');
ok('Para observation supports fact-preserving AI cleanup',paraHome.includes('Clean Up with CaseCue AI')&&paraHome.includes('Preserve every fact')&&paraHome.includes('Do not diagnose'),'Para AI observation cleanup missing');
const peGames=read('src/components/pe/PEGameLibrary.jsx');
ok('PE includes real visual game library',peHome.includes('PEGameLibrary')&&peGames.includes('Capture the Flag')&&peGames.includes('Four Square')&&peGames.includes('Kickball')&&peGames.includes('Ultimate Frisbee')&&peGames.includes('Diagram'),'PE real-game visual library missing');
const workspaceStudents=read('src/pages/WorkspaceStudents.jsx');
ok('Shared workspaces have student roster route',app.includes('path="/w/:workspace/students"')&&workspaceStudents.includes('entities.Student.create'),'shared student roster/create flow missing');
ok('Weekly family update routes exist for SPED and Gen Ed only',app.includes('path="/weekly-contact"')&&app.includes('path="/w/gen_ed/weekly-contact"')&&!app.includes('path="/w/para/weekly-contact"'),'family update route boundary is wrong');
ok('Para has no family contact navigation',!caps.includes("'/w/para/weekly-contact'")&&!caps.includes("'/w/para/contact'"),'Para family contact navigation returned');
ok('Weekly family generator enforces Para assignment',weeklyGenerator.includes('ParaStudentAccess.filter')&&weeklyGenerator.includes('not assigned to your Para account'),'weekly family Para assignment guard missing');
ok('Weekly family math separates course grade and assignment score',weeklyGenerator.includes('scorePct')&&weeklyGenerator.includes('weekly_assignment_average')&&weeklyGenerator.includes('latest_course_grades'),'weekly grade math separation missing');
ok('Weekly family AI forbids invented scores and diagnoses',weeklyGenerator.includes('Never invent grades')&&weeklyGenerator.includes('Do not mention disability'),'weekly family grounding rules missing');
ok('Weekly family no-data mode skips AI conclusions',weeklyGenerator.includes('if(!hasMeaningfulData)')&&weeklyGenerator.includes('strengths:[],focus_areas:[],next_steps:[]')&&weeklyGenerator.includes('intentionally skipped AI strengths'),'weekly family no-data hallucination guard missing');
ok('Weekly family forbids treating missing records as student traits',weeklyGenerator.includes('NEVER turn missing records into a student strength')&&weeklyGenerator.includes('attendance stability'),'weekly family missing-data rule missing');
ok('Weekly family page includes real graphs and editable message',weeklyFamily.includes('PremiumLineChart')&&weeklyFamily.includes('PremiumBarChart')&&weeklyFamily.includes('family_message')&&weeklyFamily.includes('Family PDF + Graphs'),'weekly family UI incomplete');
ok('Family PDF never exports educator review metadata',weeklyFamily.includes('notes={[]}')&&!weeklyFamily.includes('notes={pdfNotes}'),'internal review notes can leak into family PDF');
ok('No-data weekly record blocks family export and send actions',weeklyFamily.includes("{covered&&<AnalyticsPdfButton")&&weeklyFamily.includes("{covered&&<><Button onClick={copy}")&&weeklyFamily.includes("disabled={!covered}"),'no-data family sharing guard missing');
ok('Family PDF hides unavailable metric cards',weeklyFamily.includes("familyPdfMetrics=metricRows.filter(x=>x.value!=='N/A')"),'family PDF still exposes no-data metric cards');
ok('Weekly family history stores immutable data snapshots',weeklySchema.includes('chart_data')&&weeklySchema.includes('metrics')&&weeklySchema.includes('source_counts')&&weeklyFamily.includes('Weekly Update History'),'weekly family snapshot/history missing');
ok('Analytics PDF can include narrative sections',analyticsExport.includes('sections=[]')&&analyticsExport.includes("section.heading||'Summary'"),'analytics narrative sections missing');
ok('Analytics PDF header adapts to wrapped titles',analyticsExport.includes('headerHeight')&&analyticsExport.includes('titleLines.length>1?16:19'),'analytics PDF adaptive header missing');
ok('Analytics PDF preserves report line breaks and bullets',analyticsExport.includes("replace(/•/g,'-')")&&analyticsExport.includes("split(/\\r?\\n/)"),'analytics PDF text formatting regression');

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
