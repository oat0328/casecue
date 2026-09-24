import { LayoutDashboard, Users, BookOpen, FileEdit, BarChart3, MessagesSquare, FileBarChart, MessageCircle, Settings, Plug, ShieldCheck, TicketPercent, Crown, ScanLine, StickyNote, TimerReset, UserCheck, ClipboardCheck } from 'lucide-react';
export const navItems=[
 {label:'Command Center',path:'/app',icon:LayoutDashboard},
 {label:'Students',path:'/students',icon:Users},
 {label:'Instruction',path:'/instruction',icon:BookOpen},
 {label:'Attendance',path:'/attendance',icon:UserCheck},
 {label:'GradeCue',path:'/gradebook',icon:ScanLine},
 {label:'Baseline Center',path:'/baseline-center',icon:ClipboardCheck},
 {label:'Goals & Progress',path:'/progress',icon:BarChart3},
 {label:'Session Tracker',path:'/progress/sessions',icon:TimerReset},
 {label:'IEP Center',path:'/ieps',icon:FileEdit},
 {label:'Communication',path:'/communication',icon:MessagesSquare},
 {label:'Case Log',path:'/notes',icon:StickyNote},
 {label:'Reports',path:'/reports',icon:FileBarChart},
 {label:'Ask CaseCue',path:'/ask-casecue',icon:MessageCircle},
 {label:'Integrations',path:'/integrations',icon:Plug},
 {label:'Settings',path:'/settings',icon:Settings},
 {label:'Admin',path:'/admin',icon:ShieldCheck,adminOnly:true},
 {label:'Promo Codes',path:'/promo-codes',icon:TicketPercent,adminOnly:true},
 {label:'Platform Admin',path:'/platform-admin',icon:Crown,adminOnly:true}
];