import {
  LayoutDashboard, Users, FileEdit, ShieldCheck, FolderOpen, BarChart3,
  CalendarClock, BookOpen, ClipboardList, GraduationCap, UsersRound,
  FileBarChart, FlaskConical, MessageCircle, Settings, FileText
} from "lucide-react";

export const navItems = [
  { label: "Today", path: "/app", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "IEP Studio", path: "/iep-studio", icon: FileEdit },
  { label: "IEP Review", path: "/iep-review", icon: ShieldCheck },
  { label: "Documents", path: "/documents", icon: FolderOpen },
  { label: "Data Center", path: "/data-center", icon: BarChart3 },
  { label: "Instruction & Schedule", path: "/schedule", icon: CalendarClock },
  { label: "Lesson Studio", path: "/lesson-studio", icon: BookOpen },
  { label: "Substitute Plans", path: "/sub-plans", icon: ClipboardList },
  { label: "Gradebook", path: "/gradebook", icon: GraduationCap },
  { label: "Meeting Center", path: "/meetings", icon: UsersRound },
  { label: "Reports", path: "/reports", icon: FileBarChart },
  { label: "Progress Reports", path: "/progress-reports", icon: FileText },
  { label: "Practice Lab", path: "/practice-lab", icon: FlaskConical },
  { label: "Ask CaseCue", path: "/ask-casecue", icon: MessageCircle },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Admin", path: "/admin", icon: ShieldCheck, adminOnly: true },
];