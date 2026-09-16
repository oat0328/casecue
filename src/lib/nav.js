import { LayoutDashboard, Users, BookOpen, FileEdit, BarChart3, UsersRound, FileBarChart, MessageCircle, Settings, ShieldCheck, TicketPercent, Crown } from 'lucide-react';
export const navItems=[
 {label:'Today',path:'/app',icon:LayoutDashboard},
 {label:'Students',path:'/students',icon:Users},
 {label:'Instruction',path:'/instruction',icon:BookOpen},
 {label:'IEPs',path:'/ieps',icon:FileEdit},
 {label:'Progress',path:'/progress',icon:BarChart3},
 {label:'Meetings',path:'/meetings-workspace',icon:UsersRound},
 {label:'Reports',path:'/reports',icon:FileBarChart},
 {label:'Ask CaseCue',path:'/ask-casecue',icon:MessageCircle},
 {label:'Settings',path:'/settings',icon:Settings},
 {label:'Admin',path:'/admin',icon:ShieldCheck,adminOnly:true},
 {label:'Promo Codes',path:'/promo-codes',icon:TicketPercent,adminOnly:true},
 {label:'Platform Admin',path:'/platform-admin',icon:Crown,adminOnly:true}
];