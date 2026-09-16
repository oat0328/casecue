export const CASECUE_MODULES = Object.freeze({
  sped: {
    key: 'sped',
    name: 'CaseCue SPED',
    status: 'active',
    aiProfile: 'sped',
    permissionPrefix: 'sped',
  },
  speech: {
    key: 'speech',
    name: 'CaseCue Speech',
    status: 'planned',
    aiProfile: 'speech',
    permissionPrefix: 'speech',
  },
  psych: {
    key: 'psych',
    name: 'CaseCue Psych',
    status: 'planned',
    aiProfile: 'psych',
    permissionPrefix: 'psych',
  },
  nurse: {
    key: 'nurse',
    name: 'CaseCue Nurse',
    status: 'planned',
    aiProfile: 'nurse',
    permissionPrefix: 'nurse',
  },
  para: {
    key: 'para',
    name: 'CaseCue Para',
    status: 'planned',
    aiProfile: 'para',
    permissionPrefix: 'para',
  },
  sub: {
    key: 'sub',
    name: 'CaseCue Sub',
    status: 'planned',
    aiProfile: 'sub',
    permissionPrefix: 'sub',
  },
});

export const getModuleDefinition = (moduleKey) => CASECUE_MODULES[moduleKey] || null;
export const getActiveModules = () => Object.values(CASECUE_MODULES).filter((module) => module.status === 'active');
