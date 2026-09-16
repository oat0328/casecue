import { LayoutDashboard, Users, BookOpen, FileEdit, BarChart3, MessagesSquare, FileBarChart, MessageCircle, Settings, Plug, ShieldCheck, TicketPercent, Crown, ScanLine } from 'lucide-react';
export const navItems=[
 {label:'Command Center',path:'/app',icon:LayoutDashboard},
 {label:'Students',path:'/students',icon:Users},
 {label:'Instruction',path:'/instruction',icon:BookOpen},
 {label:'Gradebook',path:'/gradebook',icon:ScanLine},
 {label:'Goals & Progress',path:'/progress',icon:BarChart3},
 {label:'IEP Center',path:'/ieps',icon:FileEdit},
 {label:'Communication',path:'/communication',icon:MessagesSquare},
 {label:'Reports',path:'/reports',icon:FileBarChart},
 {label:'Ask CaseCue',path:'/ask-casecue',icon:MessageCircle},
 {label:'Integrations',path:'/integrations',icon:Plug},
 {label:'Settings',path:'/settings',icon:Settings},
 {label:'Admin',path:'/admin',icon:ShieldCheck,adminOnly:true},
 {label:'Promo Codes',path:'/promo-codes',icon:TicketPercent,adminOnly:true},
 {label:'Platform Admin',path:'/platform-admin',icon:Crown,adminOnly:true}
];