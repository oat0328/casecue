export const WORKSPACES = {
  sped: { key:'sped', name:'CaseCue SPED', short:'SPED', description:'IEPs, services, progress, evidence, meetings and specialized instruction.' },
  gen_ed: { key:'gen_ed', name:'CaseCue Gen Ed', short:'Gen Ed', description:'Classes, lessons, grading, groups, reteach and classroom progress.' },
  psych: { key:'psych', name:'CaseCue Psych', short:'Psych', description:'Evaluations, testing, observations, reports and timelines.', beta:true },
  speech: { key:'speech', name:'CaseCue Speech', short:'Speech', description:'Caseload, groups, sessions, trials, goals and progress.' },
  ot: { key:'ot', name:'CaseCue OT', short:'OT', description:'Caseload, sessions, assessments, goals and functional progress.', beta:true },
  para: { key:'para', name:'CaseCue Para', short:'Para', description:'Pull-in, pull-out and self-contained support, grades, baseline capture, work grading, observations and quick data.' },
  nurse: { key:'nurse', name:'CaseCue Nurse', short:'Nurse', description:'Student visits, medications, screenings, care plans and follow-up.', beta:true },
  substitute: { key:'substitute', name:'CaseCue Substitute', short:'Sub', description:'Daily and permanent sub schedules, lesson planning, grading, attendance, approved supports and teacher handoff.' },
  pe: { key:'pe', name:'CaseCue PE', short:'PE', description:'PE schedules, game and exercise generation, activity plans, grading and class notes.' },
};

export const workspaceKeys=Object.keys(WORKSPACES).sort((a,b)=>WORKSPACES[a].short.localeCompare(WORKSPACES[b].short));

const roleWorkspace=(user)=>{
  const role=String(user?.onboarding?.role||user?.data?.onboarding?.role||'').toLowerCase();
  if(role.includes('para'))return'para';
  if(role.includes('speech'))return'speech';
  if(role.includes('occupational')||role==='ot')return'ot';
  if(role.includes('nurse'))return'nurse';
  if(role.includes('psych'))return'psych';
  if(role.includes('substitute')||role.includes('sub '))return'substitute';
  if(role.includes('physical education')||role==='pe')return'pe';
  if(role.includes('general education')||role.includes('gen ed'))return'gen_ed';
  if(role.includes('special education')||role.includes('case manager'))return'sped';
  return null;
};

export function explicitUserWorkspaces(user){
  const raw=user?.workspaces||user?.data?.workspaces;
  return Array.isArray(raw)?raw.filter(k=>WORKSPACES[k]):[];
}

export function getUserWorkspaces(user){
  const explicit=explicitUserWorkspaces(user);
  const active=user?.active_workspace||user?.data?.active_workspace;
  const multi=user?.multi_workspace_access===true||user?.data?.multi_workspace_access===true;

  // Platform/app admins may inspect every product workspace.
  if(user?.role==='admin'&&explicit.length===0)return workspaceKeys;

  // workspaces is the entitlement list. Unless multi-workspace access is explicitly
  // enabled, an account receives ONE workspace only. This prevents a newly-created
  // Para/PE/Sub account from inheriting SPED merely because SPED used to be the fallback.
  if(explicit.length){
    if(multi)return explicit;
    if(active&&explicit.includes(active))return[active];
    return[explicit[0]];
  }

  if(active&&WORKSPACES[active])return[active];

  const inferred=roleWorkspace(user);
  if(inferred)return[inferred];

  // Legacy accounts created before workspace entitlements existed were SPED accounts.
  return['sped'];
}

export function getActiveWorkspace(user){
  const allowed=getUserWorkspaces(user);
  const active=user?.active_workspace||user?.data?.active_workspace;
  return allowed.includes(active)?active:allowed[0];
}

export function workspaceHome(key){return key==='sped'?'/app':`/w/${key}`;}
