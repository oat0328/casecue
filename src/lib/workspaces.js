export const WORKSPACES = {
  sped: { key:'sped', name:'CaseCue SPED', short:'SPED', description:'IEPs, services, progress, evidence, meetings and specialized instruction.' },
  gen_ed: { key:'gen_ed', name:'CaseCue Gen Ed', short:'Gen Ed', description:'Classes, lessons, grading, groups, reteach and classroom progress.' },
  psych: { key:'psych', name:'CaseCue Psych', short:'Psych', description:'Evaluations, testing, observations, reports and timelines.' },
  speech: { key:'speech', name:'CaseCue Speech', short:'Speech', description:'Caseload, groups, sessions, trials, goals and progress.' },
  ot: { key:'ot', name:'CaseCue OT', short:'OT', description:'Caseload, sessions, assessments, goals and functional progress.' },
  para: { key:'para', name:'CaseCue Para', short:'Para', description:'Daily assignments, supports, prompting, observations and quick data.' },
  nurse: { key:'nurse', name:'CaseCue Nurse', short:'Nurse', description:'Student visits, medications, screenings, care plans and follow-up.' },
};
export const workspaceKeys=Object.keys(WORKSPACES);
export function getUserWorkspaces(user){
  const raw=user?.workspaces||user?.data?.workspaces;
  if(Array.isArray(raw)&&raw.length) return raw.filter(k=>WORKSPACES[k]);
  return ['sped'];
}
export function getActiveWorkspace(user){
  const allowed=getUserWorkspaces(user);
  const active=user?.active_workspace||user?.data?.active_workspace;
  return allowed.includes(active)?active:allowed[0];
}
export function workspaceHome(key){return key==='sped'?'/app':`/w/${key}`;}
