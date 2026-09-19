import { CalendarClock, ScanLine, BookOpen, Users, FileText, StickyNote, Activity, HeartPulse, Brain, GraduationCap } from 'lucide-react';

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
      ['Gradebook','/gradebook',ScanLine],
    ],
  },
  gen_ed: {
    home: '/w/gen_ed',
    nav: [
      ['Today','/w/gen_ed',GraduationCap],
      ['Schedule','/w/gen_ed/schedule',CalendarClock],
      ['Lessons','/instruction/lessons',BookOpen],
      ['Super Grader','/w/gen_ed/grade',ScanLine],
      ['Groups & Reteach','/w/gen_ed/groups',Users],
      ['IEP & Accommodations','/w/gen_ed/iep-access',FileText],
      ['Parent Contact','/w/gen_ed/contact',StickyNote],
    ],
  },
  para: {
    home: '/w/para',
    nav: [
      ['Today & Capture','/w/para',GraduationCap],
      ['Schedule','/w/para/schedule',CalendarClock],
      ['My Students & Grades','/w/para/students',Users],
      ['Grade Student Work','/w/para/grade',ScanLine],
      ['Baseline Scanner','/w/para/baseline',FileText],
      ['Understand IEP','/w/para/iep-guide',FileText],
      ['My Notes','/w/para/notes',StickyNote],
    ],
  },
  speech: {
    home: '/w/speech',
    nav: [
      ['Today & Sessions','/w/speech',GraduationCap],
      ['Schedule','/w/speech/schedule',CalendarClock],
      ['IEP & Speech Input','/w/speech/iep',FileText],
    ],
  },
  ot: {
    home: '/w/ot',
    nav: [
      ['OT Sessions','/w/ot',Activity],
      ['Schedule','/w/ot/schedule',CalendarClock],
    ],
  },
  nurse: {
    home: '/w/nurse',
    nav: [
      ['Nurse Today','/w/nurse',HeartPulse],
      ['Schedule','/w/nurse/schedule',CalendarClock],
    ],
  },
  psych: {
    home: '/w/psych',
    nav: [
      ['Psych Workspace','/w/psych',Brain],
      ['Schedule','/w/psych/schedule',CalendarClock],
    ],
  },
  substitute: {
    home: '/w/substitute',
    nav: [
      ['Substitute Day','/w/substitute',GraduationCap],
      ['Schedule','/w/substitute/schedule',CalendarClock],
      ['Lesson Planner','/w/substitute/lesson',BookOpen],
      ['Gradebook','/w/substitute/grade',ScanLine],
    ],
  },
  pe: {
    home: '/w/pe',
    nav: [
      ['PE Planner','/w/pe',GraduationCap],
      ['Schedule','/w/pe/schedule',CalendarClock],
      ['Lesson Planner','/w/pe/lesson',BookOpen],
      ['Gradebook','/w/pe/grade',ScanLine],
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
    gradebook: ['Gradebook','Super Grader','Grade Student Work'],
    lessons: ['Lessons','Lesson Planner'],
  };
  const labels = aliases[tool] || [];
  const row = nav.find(([label]) => labels.includes(label));
  return row?.[1] || null;
}

export function workspaceHasTool(key, tool) {
  return Boolean(workspaceToolPath(key, tool));
}
