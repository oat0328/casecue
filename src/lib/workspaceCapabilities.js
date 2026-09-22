import { CalendarClock, ScanLine, BookOpen, Users, FileText, StickyNote, Activity, HeartPulse, Brain, GraduationCap, UserCheck } from 'lucide-react';

/**
 * Central CaseCue workspace capability registry.
 *
 * Rule: if a tool is shared, route every applicable workspace through the SAME
 * underlying page/component. Workspace-specific data/permissions are handled by
 * adapters, not by cloning feature code.
 */
export const WORKSPACE_TOOLS = {
  sped: {
    home: '/app',
    nav: [
      ['Today','/app',GraduationCap],
      ['Schedule','/instruction/schedule',CalendarClock],
      ['Attendance','/attendance',UserCheck],
      ['GradeCue','/gradebook',ScanLine],
      ['Weekly Family Update','/weekly-contact',StickyNote],
    ],
  },
  gen_ed: {
    home: '/w/gen_ed',
    nav: [
      ['Today','/w/gen_ed',GraduationCap],
      ['Schedule','/w/gen_ed/schedule',CalendarClock],
      ['Attendance','/w/gen_ed/attendance',UserCheck],
      ['Lessons','/instruction/lessons',BookOpen],
      ['GradeCue','/w/gen_ed/grade',ScanLine],
      ['Groups & Reteach','/w/gen_ed/groups',Users],
      ['IEP & Accommodations','/w/gen_ed/iep-access',FileText],
      ['Weekly Family Update','/w/gen_ed/weekly-contact',StickyNote],
      ['Parent Contact','/w/gen_ed/contact',StickyNote],
    ],
  },
  para: {
    home: '/w/para',
    nav: [
      ['Today & Capture','/w/para',GraduationCap],
      ['Schedule','/w/para/schedule',CalendarClock],
      ['Attendance','/w/para/attendance',UserCheck],
      ['My Students','/w/para/students',Users],
      ['Student Work','/w/para/grade',ScanLine],
      ['Assessments','/w/para/baseline',FileText],
      ['Student Supports','/w/para/iep-guide',FileText],
      ['My Notes','/w/para/notes',StickyNote],
    ],
  },
  speech: {
    home: '/w/speech',
    nav: [
      ['Today & Sessions','/w/speech',GraduationCap],
      ['Schedule','/w/speech/schedule',CalendarClock],
      ['Attendance','/w/speech/attendance',UserCheck],
      ['IEP & Speech Input','/w/speech/iep',FileText],
      ['Notes & Handoffs','/w/speech/notes',StickyNote],
    ],
  },
  ot: {
    home: '/w/ot',
    nav: [
      ['OT Sessions','/w/ot',Activity],
      ['Schedule','/w/ot/schedule',CalendarClock],
      ['Attendance','/w/ot/attendance',UserCheck],
      ['Notes & Data','/w/ot/notes',StickyNote],
    ],
  },
  nurse: {
    home: '/w/nurse',
    nav: [
      ['Nurse Today','/w/nurse',HeartPulse],
      ['Schedule','/w/nurse/schedule',CalendarClock],
      ['Attendance','/w/nurse/attendance',UserCheck],
    ],
  },
  psych: {
    home: '/w/psych',
    nav: [
      ['Psych Workspace','/w/psych',Brain],
      ['Schedule','/w/psych/schedule',CalendarClock],
      ['Attendance','/w/psych/attendance',UserCheck],
    ],
  },
  substitute: {
    home: '/w/substitute',
    nav: [
      ['Substitute Day','/w/substitute',GraduationCap],
      ['Schedule','/w/substitute/schedule',CalendarClock],
      ['Attendance','/w/substitute/attendance',UserCheck],
      ['Lesson Planner','/w/substitute/lesson',BookOpen],
      ['GradeCue','/w/substitute/grade',ScanLine],
      ['Teacher Handoff','/w/substitute/notes',StickyNote],
    ],
  },
  pe: {
    home: '/w/pe',
    nav: [
      ['PE Planner','/w/pe',GraduationCap],
      ['Schedule','/w/pe/schedule',CalendarClock],
      ['Attendance','/w/pe/attendance',UserCheck],
      ['Lesson Planner','/w/pe/lesson',BookOpen],
      ['GradeCue','/w/pe/grade',ScanLine],
      ['Class Notes','/w/pe/notes',StickyNote],
    ],
  },
};

export function workspaceNav(key) {
  return (WORKSPACE_TOOLS[key]?.nav || []).map(([label,path,icon]) => ({ label, path, icon }));
}

export function workspaceToolPath(key, tool) {
  const nav = WORKSPACE_TOOLS[key]?.nav || [];
  const aliases = {
    schedule: ['Schedule'],
    gradebook: ['GradeCue','Gradebook','Super Grader','Grade Student Work','Student Work'],
    lessons: ['Lessons','Lesson Planner'],
    attendance: ['Attendance'],
  };
  const labels = aliases[tool] || [];
  const row = nav.find(([label]) => labels.includes(label));
  return row?.[1] || null;
}

export function workspaceHasTool(key, tool) {
  return Boolean(workspaceToolPath(key, tool));
}

export function workspaceFromPath(pathname='', fallback='sped') {
  const match=String(pathname).match(/^\/w\/([^/]+)/);
  return match?.[1] || fallback;
}

export const workspaceUsesIepGradeLinking = (key) => ['sped','gen_ed'].includes(key);
