import {
  LayoutDashboard, Users, FileEdit, ShieldCheck, BarChart3,
  CalendarClock, BookOpen, ClipboardList, GraduationCap, UsersRound, Network,
  FileBarChart, FlaskConical, MessageCircle, Settings, FileText, Crown, Timer,
  LifeBuoy, TicketPercent, Library
} from "lucide-react";

export const navItems = [
  { label: "Today", path: "/app", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "IEP Studio", path: "/iep-studio", icon: FileEdit },
  { label: "Meeting Navigator", path: "/meeting-navigator", icon: ClipboardList },
  { label: "Session Tracker", path: "/session-tracker", icon: Timer },
  { label: "IEP Review", path: "/iep-review", icon: ShieldCheck },
  { label: "Data Center", path: "/data-center", icon: BarChart3 },
  { label: "Instruction & Schedule", path: "/schedule", icon: CalendarClock },
  { label: "Lesson Studio", path: "/lesson-studio", icon: BookOpen },
  { label: "Substitute Plans", path: "/sub-plans", icon: ClipboardList },
  { label: "Gradebook", path: "/gradebook", icon: GraduationCap },
  { label: "Meeting Center", path: "/meetings", icon: UsersRound },
  { label: "Goal Groups", path: "/goal-groups", icon: Network },
  { label: "Reports", path: "/reports", icon: FileBarChart },
  { label: "Progress Reports", path: "/progress-reports", icon: FileText },
  { label: "Resource Hub", path: "/resource-hub", icon: Library },
  { label: "Practice Lab", path: "/practice-lab", icon: FlaskConical },
  { label: "Ask CaseCue", path: "/ask-casecue", icon: MessageCircle },
  { label: "Help Center", path: "/help", icon: LifeBuoy },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Admin", path: "/admin", icon: ShieldCheck, adminOnly: true },
  { label: "Promo Codes", path: "/promo-codes", icon: TicketPercent, adminOnly: true },
  { label: "Platform Admin", path: "/platform-admin", icon: Crown, adminOnly: true },
];