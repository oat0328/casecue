import { LayoutDashboard, Users, BookOpen, FileEdit, BarChart3, UsersRound, FileBarChart, MessageCircle, Settings, ShieldCheck, TicketPercent, Crown } from 'lucide-react';
export const navItems=[
 {label:"Today's Teaching",path:'/app',icon:LayoutDashboard},
 {label:'Student Caseload',path:'/students',icon:Users},
 {label:'Teach & Plan',path:'/instruction',icon:BookOpen},
 {label:'IEP Center',path:'/ieps',icon:FileEdit},
 {label:'Goal Progress',path:'/progress',icon:BarChart3},
 {label:'IEP & MET Meetings',path:'/meetings-workspace',icon:UsersRound},
 {label:'Reports & Exports',path:'/reports',icon:FileBarChart},
 {label:'Ask CaseCue',path:'/ask-casecue',icon:MessageCircle},
 {label:'Settings',path:'/settings',icon:Settings},
 {label:'Admin',path:'/admin',icon:ShieldCheck,adminOnly:true},
 {label:'Promo Codes',path:'/promo-codes',icon:TicketPercent,adminOnly:true},
 {label:'Platform Admin',path:'/platform-admin',icon:Crown,adminOnly:true}
];