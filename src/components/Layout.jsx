import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { Menu, X, LogOut, ChevronDown, Sparkles, Search, ExternalLink } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import AskCaseCueButton from "@/components/AskCaseCueButton";
import FloatingFeedbackButton from "@/components/feedback/FloatingFeedbackButton";
import NotificationsBell from "@/components/NotificationsBell";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import MobileQuickCapture from "@/components/MobileQuickCapture";

const PRIMARY = ["/app","/students","/iep-studio","/session-tracker","/data-center","/progress-monitoring-day","/meetings","/lesson-studio","/reports"];
const SECONDARY = ["/meeting-navigator","/iep-review","/schedule","/sub-plans","/gradebook","/goal-groups","/progress-reports","/evidence-vault","/resource-hub","/practice-lab","/ask-casecue","/help","/configuration","/settings"];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: caseloadStudents } = useAsync(() => base44.entities.Student.list('-updated_date', 500), []);
  const caseloadCount = (caseloadStudents || []).length;
  const visible = navItems.filter((item) => !item.adminOnly || user?.role === "admin");
  const primary = PRIMARY.map(p => visible.find(i => i.path === p)).filter(Boolean);
  const secondary = SECONDARY.map(p => visible.find(i => i.path === p)).filter(Boolean);
  const admin = visible.filter(i => i.adminOnly);
  const initials = user?.full_name ? user.full_name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user?.email?.[0] || "U").toUpperCase();

  const handleLogout = async () => { await logout(); window.location.href = "/login"; };

  const NavItem = ({ item }) => (
    <NavLink key={item.path} to={item.path} end={item.path === "/app"} onClick={()=>setOpen(false)} className={({isActive}) => cn(
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
      isActive ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
    )}>
      <item.icon className="h-[17px] w-[17px] shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.path === "/students" && <span className="ml-auto min-w-6 rounded-full bg-sky-500/15 px-2 py-0.5 text-center text-[11px] font-black text-sky-300 group-[.active]:text-sky-700">{caseloadCount}</span>}
    </NavLink>
  );

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-[#08111f] text-white">
      <div className="h-[72px] px-5 flex items-center border-b border-white/10">
        <Link to="/app" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-950/30"><Sparkles className="h-5 w-5"/></div>
          <div><div className="text-lg font-black tracking-tight">CaseCue</div><div className="text-[10px] uppercase tracking-[.18em] text-slate-400 font-semibold">Plan. Teach. Track. Prove.</div></div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div><div className="px-3 mb-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Workspace</div><div className="space-y-1">{primary.map(item=><NavItem key={item.path} item={item}/>)}</div></div>
        <div><div className="px-3 mb-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">More tools</div><div className="space-y-1">{secondary.map(item=><NavItem key={item.path} item={item}/>)}</div></div>
        {admin.length > 0 && <div><div className="px-3 mb-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Administration</div><div className="space-y-1">{admin.map(item=><NavItem key={item.path} item={item}/>)}</div></div>}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white"><ExternalLink className="h-4 w-4"/>Public website</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[272px] z-40"><Sidebar/></aside>
      {open && <div className="lg:hidden fixed inset-0 z-50"><div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={()=>setOpen(false)}/><aside className="absolute inset-y-0 left-0 w-[290px] shadow-2xl"><button aria-label="Close menu" className="absolute z-10 top-5 right-4 p-1.5 rounded-lg text-slate-300 hover:bg-white/10" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></button><Sidebar/></aside></div>}

      <div className="lg:pl-[272px] min-h-screen">
        <header className="sticky top-0 z-30 h-[72px] border-b border-slate-200/80 bg-white/90 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <button aria-label="Open menu" className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={()=>setOpen(true)}><Menu className="h-5 w-5"/></button>
          <button onClick={()=>navigate('/ask-casecue')} className="hidden md:flex items-center gap-2 h-10 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 hover:border-blue-200 hover:bg-white transition-colors"><Search className="h-4 w-4"/><span>Ask CaseCue or search your workspace…</span></button>
          <div className="flex-1"/>
          <NotificationsBell/>
          <Button size="sm" className="hidden sm:flex bg-slate-950 hover:bg-slate-800 text-white" onClick={()=>navigate('/ask-casecue')}><Sparkles className="h-4 w-4 mr-2"/>Ask CaseCue</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 hover:bg-slate-100"><Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-sky-400 text-white text-xs font-bold">{initials}</AvatarFallback></Avatar><div className="hidden sm:block text-left"><div className="max-w-[150px] truncate text-sm font-semibold text-slate-900">{user?.full_name || user?.email}</div><div className="text-[11px] text-slate-500">CaseCue workspace</div></div><ChevronDown className="h-4 w-4 text-slate-400"/></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onClick={()=>navigate('/settings')}>Settings</DropdownMenuItem><DropdownMenuItem onClick={()=>navigate('/')}>Public website</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600"><LogOut className="h-4 w-4 mr-2"/>Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="px-4 sm:px-6 lg:px-8 py-7 pb-28 max-w-[1500px] mx-auto"><Outlet/></main>
      </div>
      <AskCaseCueButton/>
      <FloatingFeedbackButton/>
      <MobileQuickCapture/>
    </div>
  );
}
