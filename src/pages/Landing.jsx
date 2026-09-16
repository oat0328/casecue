import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ShieldCheck, FileEdit, MessageCircle, BarChart3, BookOpen,
  ClipboardList, FlaskConical, Check, Lock, Menu, Users, CalendarClock,
  UsersRound, LayoutDashboard, PlayCircle, ArrowRight, CheckCircle2, Workflow, ScanLine, HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/lib/AuthContext";
import DemoRequestForm from "@/components/DemoRequestForm";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function Nav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl brand-gradient flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">CaseCue</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <a href="#product" className="hover:text-foreground">Product</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#demo" className="hover:text-foreground">Demo</a>
          <Link to="/testimonials" className="hover:text-foreground">Testimonials</Link>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/app"><Button size="sm" className="brand-gradient text-white">Open app</Button></Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/register"><Button size="sm" className="brand-gradient text-white">Start free trial</Button></Link>
            </>
          )}
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
          {isAuthenticated ? (
            <Link to="/app" onClick={() => setOpen(false)}><Button className="w-full brand-gradient text-white">Open app</Button></Link>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full">Sign in</Button></Link>
              <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full brand-gradient text-white">Start free trial</Button></Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">{children}</div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Premium hero + product video */}
      <section className="relative overflow-hidden bg-[#07111f] pt-28 pb-20 sm:pt-36 sm:pb-28 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,.28),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(14,165,233,.20),transparent_30%),linear-gradient(180deg,#07111f_0%,#0b1324_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-12 lg:gap-16 items-center">
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-sky-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Built for special education teams
              </div>
              <h1 className="mt-6 text-4xl sm:text-6xl xl:text-7xl font-black tracking-[-0.045em] leading-[0.98]">
                Everything Special Education.<br/><span className="text-sky-300">One Place.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl leading-8 text-slate-300">
                IEPs. Evaluations. BIPs. Progress. Services. Meetings. Documentation. CaseCue brings the work together so your team can focus on supporting students instead of chasing paperwork.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/register"><Button size="lg" className="h-12 px-7 bg-white text-slate-950 hover:bg-slate-100 text-base font-bold">See How Life Gets Easier <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <a href="#video"><Button size="lg" variant="outline" className="h-12 px-7 border-white/20 bg-white/5 text-white hover:bg-white/10 text-base"><PlayCircle className="mr-2 h-4 w-4" /> Watch the 2 Minute Story</Button></a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> 14-day free trial</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> No credit card to start</span>
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-300" /> Educator review stays in control</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .65, delay: .08 }} className="relative">
              <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-r from-blue-500/20 via-sky-400/10 to-cyan-300/20 blur-2xl" />
              <div className="relative rounded-[30px] border border-white/10 bg-white/10 p-2.5 shadow-2xl backdrop-blur-xl">
                <div className="overflow-hidden rounded-[23px] border border-white/10 bg-black">
                  <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-slate-950 px-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                    <div className="ml-3 text-[11px] font-semibold text-slate-400">getcasecue.com • Product Tour</div>
                  </div>
                  <div className="aspect-video bg-slate-50 text-slate-900 p-4 sm:p-5">
                    <div className="grid h-full grid-cols-[92px_1fr] sm:grid-cols-[120px_1fr] overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <aside className="bg-[#08111f] p-3 text-white">
                        <div className="flex items-center gap-2 text-xs font-black"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500">✦</span><span>CaseCue</span></div>
                        <div className="mt-5 space-y-2 text-[8px] sm:text-[10px] text-slate-400">{['Today','Students','IEP Studio','Progress','Sessions','Meetings'].map((x,i)=><div key={x} className={`rounded-md px-2 py-1.5 ${i===0?'bg-white text-slate-950 font-bold':'bg-white/0'}`}>{x}</div>)}</div>
                      </aside>
                      <div className="p-3 sm:p-4 bg-slate-50">
                        <div className="flex items-center justify-between"><div><div className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-sky-600">CaseCue Today</div><div className="text-xs sm:text-sm font-black mt-1">Your caseload, connected.</div></div><div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[8px] font-black">CC</div></div>
                        <div className="mt-3 grid grid-cols-4 gap-1.5">{[['16','Students'],['4','Actions'],['3','Meetings'],['28','Evidence']].map(([v,l])=><div key={l} className="rounded-lg border bg-white p-2"><div className="text-[10px] sm:text-xs font-black">{v}</div><div className="text-[6px] sm:text-[8px] text-slate-400">{l}</div></div>)}</div>
                        <div className="mt-2 grid grid-cols-[1.2fr_.8fr] gap-2">
                          <div className="rounded-lg border bg-white p-2"><div className="text-[8px] sm:text-[10px] font-bold">Goal progress</div><div className="mt-2 h-16 flex items-end gap-1">{[35,48,57,66,73,82].map((h,i)=><div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-sky-400" style={{height:`${h}%`}} />)}</div></div>
                          <div className="space-y-2"><div className="rounded-lg border bg-white p-2"><div className="text-[8px] sm:text-[10px] font-bold">What needs attention</div><div className="mt-1.5 space-y-1 text-[6px] sm:text-[8px] text-slate-500"><div>• Progress data due</div><div>• Meeting brief ready</div><div>• Session note missing</div></div></div><div className="rounded-lg bg-[#0b1730] p-2 text-white"><div className="text-[7px] sm:text-[9px] font-black text-sky-300">CaseCue Proof™</div><div className="text-[6px] sm:text-[8px] text-slate-300 mt-1">Trace every statement to evidence.</div></div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-2 pt-3">
                  {[['IEP → Evidence','Connected workflow'],['Family View','View-only sharing'],['CaseCue Proof™','Trace the evidence']].map(([title,sub]) => (
                    <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs font-bold text-white">{title}</div>
                      <div className="mt-1 text-[10px] text-slate-400">{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product tour proof band */}
      <Section id="video" className="bg-slate-50 py-16 sm:py-20">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-primary"><PlayCircle className="h-4 w-4" /> See CaseCue in action</div>
          <h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">One connected workflow from IEP to evidence.</h2>
          <p className="mt-4 text-muted-foreground leading-7">See how teachers move from student records to progress monitoring, meeting prep, and family communication without rebuilding the same information in separate places.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[{icon:Workflow,title:"Connected workflow",desc:"IEP goals, sessions, lessons, student work, and reports stay tied together."},{icon:ScanLine,title:"Evidence in one place",desc:"Use approved data and work samples to support progress updates and future IEP writing."},{icon:HeartHandshake,title:"Family communication",desc:"Share a separate view-only experience with only the information you choose."}].map((f) => <div key={f.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center"><f.icon className="h-5 w-5 text-blue-600" /></div><div className="mt-4 font-black text-lg">{f.title}</div><div className="mt-2 text-sm text-muted-foreground leading-6">{f.desc}</div></div>)}
        </div>
      </Section>

      {/* A day in special education */}
      <Section id="day-story" className="bg-white">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-28"><div className="text-xs font-black uppercase tracking-[.2em] text-primary">We know your day</div><h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">Your day should not feel this hard.</h2><p className="mt-4 text-muted-foreground leading-7">Every deadline matters. Every document matters. Every student matters. But the systems around the work should make the day clearer, not heavier.</p><div className="mt-6 rounded-3xl bg-[#07111f] p-6 text-white"><div className="text-sm font-black text-sky-300">What if tomorrow looked different?</div><p className="mt-2 text-sm leading-6 text-slate-300">Your schedule is visible. Student records are connected. Progress evidence is where it belongs. Meetings and deadlines are already in view.</p></div></div>
          <div className="space-y-3">{[['7:00 AM','Checking emails'],['8:00 AM','Parent concern'],['9:00 AM','IEP meeting'],['10:30 AM','Searching for missing documentation'],['12:00 PM','Service tracking'],['2:00 PM','Compliance reminder'],['4:00 PM','Another meeting'],['5:00 PM','Still working'],['7:00 PM','Paperwork at home']].map(([time,work],i)=><div key={time} className="group flex gap-4 rounded-2xl border bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm"><div className="w-20 shrink-0 text-sm font-black text-blue-700">{time}</div><div className="flex-1 font-bold text-slate-800">{work}</div><div className="text-xs font-semibold text-slate-400">{i<8?'Another thing to carry':'Work followed you home'}</div></div>)}</div>
        </div>
      </Section>

      {/* Problem */}
      <Section id="problem" className="bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-black uppercase tracking-[.2em] text-primary">We know your day</div><h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">Special education is hard enough.</h2>
          <p className="mt-4 text-muted-foreground">The work should not be scattered across spreadsheets, emails, paper files, drives, shared folders and disconnected systems.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {["Drowning in paperwork", "Lost in multiple systems", "Compliance anxiety", "Fear of missing deadlines", "Taking work home", "Disconnected teams", "Duplicate data entry", "Limited visibility", "Staff burnout"].map((p) => (
              <div key={p} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                {p}
              </div>
            ))}
          </div>
          <p className="mt-8 text-2xl font-black">What if tomorrow looked different?</p>
          <p className="mt-2 text-muted-foreground">
            One place. One login. One workflow. One team. One source of truth.{" "}
            <a href="#pricing" className="text-primary font-medium hover:underline">See how →</a>
          </p>
        </div>
      </Section>

      {/* Features */}
      <Section id="product">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need. One place.</h2>
          <p className="mt-3 text-muted-foreground">Built with special education workflows — not adapted from generic software.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              icon: Users, title: "Student Management", desc: "Store important student information securely and access it anytime.",
              items: ["Student Profiles", "Service Information", "Case Notes", "Document Status"],
            },
            {
              icon: CalendarClock, title: "Deadline Tracking", desc: "Never miss another important due date.",
              items: ["IEP Due Dates", "Annual Reviews", "Reevaluations", "Compliance Alerts", "Automated Reminders"],
            },
            {
              icon: UsersRound, title: "Meeting Management", desc: "Stay prepared for every meeting.",
              items: ["Meeting Notes", "Action Items", "Scheduling Reminders", "Documentation Tracking"],
            },
            {
              icon: LayoutDashboard, title: "Dashboard", desc: "See your entire caseload at a glance.",
              items: ["Upcoming Deadlines", "Compliance Status", "Student Counts", "Workload Overview", "Alert Notifications"],
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 card-shadow hover:card-shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-xl brand-gradient-soft flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
              <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                {f.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Who it's for */}
      <Section id="who" className="bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for special education teams.</h2>
          <p className="mt-3 text-muted-foreground">CaseCue serves the people who carry the caseload.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Special Education Teachers", "Case Managers", "Related Service Providers", "Educational Coordinators", "School Teams"].map((w) => (
              <span key={w} className="rounded-full border border-primary/20 bg-background px-4 py-2 text-sm font-medium text-primary">{w}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* AI platform */}
      <Section id="platform">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-black uppercase tracking-[.2em] text-primary">Special Education Command Center</div><h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">Everything connected.</h2>
          <p className="mt-3 text-muted-foreground">Students, schedules, IEP work, services, evidence, meetings and reporting move through one connected home base.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: FileEdit, title: "IEP Studio", desc: "Draft present levels, goals, and accommodations in minutes — every section flagged for team review." },
            { icon: ShieldCheck, title: "IEP Review", desc: "Run a quality review that catches missing baselines, vague goals, and misaligned data." },
            { icon: BarChart3, title: "Progress Monitoring", desc: "Track correct/total, percentages, and prompting levels. See trends at a glance." },
            { icon: BookOpen, title: "Lesson Studio", desc: "Generate lessons connected to student goals with I Do / We Do / You Do structure." },
            { icon: ClipboardList, title: "Substitute Plans", desc: "Never panic over an absence. Generate daily, planned, or emergency sub plans." },
            { icon: MessageCircle, title: "Ask CaseCue", desc: "Ask questions across your whole caseload and get answers grounded in your verified data." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 card-shadow hover:card-shadow-lg transition-shadow">
              <div className="h-11 w-11 rounded-xl brand-gradient-soft flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Transformation */}
      <Section id="transformation" className="bg-[#07111f] text-white">
        <div className="text-center max-w-3xl mx-auto"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">The transformation</div><h2 className="mt-3 text-3xl sm:text-5xl font-black">From scattered work to one connected home.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2"><div className="rounded-[28px] border border-rose-300/10 bg-white/5 p-7"><div className="text-xs font-black uppercase tracking-wider text-rose-300">Before CaseCue</div><div className="mt-5 grid grid-cols-2 gap-3">{['Stress','Chaos','Searching','Disorganization','Missed visibility','Disconnected systems'].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-300">{x}</div>)}</div></div><div className="rounded-[28px] border border-sky-300/20 bg-sky-400/10 p-7"><div className="text-xs font-black uppercase tracking-wider text-sky-300">With one connected home</div><div className="mt-5 grid grid-cols-2 gap-3">{['Clarity','Organization','Visibility','Confidence','Connected teams','Peace of mind'].map(x=><div key={x} className="rounded-xl border border-sky-200/10 bg-white/10 p-3 text-sm font-bold text-white">{x}</div>)}</div></div></div>
        <div className="mt-8 text-center text-xl font-black">Less chaos. More student impact.</div>
      </Section>

      {/* Practice Lab */}
      <Section id="practice" className="bg-card">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-3"><FlaskConical className="h-4 w-4" /> Practice Lab</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Sharpen your skills on fictional students.</h2>
            <p className="mt-4 text-muted-foreground">Practice identifying IEP issues with completely fictional scenarios. Run CaseCue Review, see what you caught and what you missed, and earn a practice score.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8 card-shadow-lg text-center">
            <FlaskConical className="h-10 w-10 text-primary mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">Simulation Complete</div>
            <div className="text-4xl font-bold text-gradient mt-1">94 / 100</div>
            <div className="mt-2 text-sm text-muted-foreground">You found 8 of 9 potential issues</div>
          </div>
        </div>
      </Section>

      {/* Privacy & Trust */}
      <Section id="privacy">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Privacy & trust, built in.</h2>
          <p className="mt-4 text-muted-foreground">Designed with FERPA-focused privacy and security controls for authorized education use. Private document storage, row-level access, audit logging, minimum-necessary processing, and data export & deletion.</p>
          <p className="mt-4 text-xs text-muted-foreground italic">CaseCue does not make legal or IEP-team decisions. All generated output is a draft requiring educator review.</p>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" className="bg-card">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, honest pricing.</h2>
          <p className="mt-3 text-muted-foreground">One plan with everything. Start free for 14 days.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
          <div className="rounded-2xl border-2 border-primary/40 bg-background p-8 card-shadow-lg relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-1 text-xs font-semibold text-white">Launch offer</div>
            <div className="text-sm font-semibold text-primary">Founding Teacher</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-5xl font-bold">$24.99</span>
              <span className="text-muted-foreground mb-2">/ month</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Everything CaseCue offers, in one simple plan.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "14-day free trial — no credit card required",
                "Your full caseload — no per-student fees",
                "Every teacher feature included",
                "Founding price locked while your subscription stays active",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {item}</li>
              ))}
            </ul>
            <Link to="/register"><Button className="w-full mt-8 brand-gradient text-white h-12 text-base">Start Free Trial</Button></Link>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8 card-shadow flex flex-col">
            <div className="text-sm font-semibold text-primary">Schools & Districts</div>
            <div className="mt-2 text-2xl font-bold">Contact us for pricing</div>
            <p className="mt-2 text-sm text-muted-foreground">Bring CaseCue to your whole team.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Multi-teacher access",
                "Pilot program pricing",
                "Guided onboarding session",
                "Direct line to the CaseCue team",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {item}</li>
              ))}
            </ul>
            <a href="#demo" className="mt-auto"><Button variant="outline" className="w-full mt-8 h-12 text-base">Book a Demo</Button></a>
          </div>
        </div>
      </Section>

      {/* Demo */}
      <Section id="demo">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Book a Demo</h2>
          <p className="mt-3 text-muted-foreground">See CaseCue with your own caseload in mind — we'll walk you through it personally.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Prefer email? <a href="mailto:contact@getcasecue.com" className="text-primary font-medium hover:underline">contact@getcasecue.com</a>
          </p>
        </div>
        <DemoRequestForm />
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10">Frequently asked questions</h2>
          <Accordion type="single" collapsible>
            {[
              { q: "Does CaseCue write legal IEPs?", a: "No. CaseCue drafts IEP sections to support your work, but every generated output is labeled 'Draft — Educator/IEP Team Review Required.' CaseCue never makes legal or IEP-team decisions." },
              { q: "Is CaseCue FERPA certified?", a: "CaseCue is designed with FERPA-focused privacy and security controls for authorized education use. We do not claim certification. You confirm authorization before uploading student data." },
              { q: "Will the system invent facts about my students?", a: "No. Ask CaseCue only uses your verified records. If information is missing, it tells you it doesn't have enough to answer." },
              { q: "Can I export or delete my data?", a: "Yes. Settings includes one-click data export and a data deletion request — you stay in control of your information at all times." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 brand-gradient" />
        <div className="relative max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">You Already Have Enough To Manage.</h2>
          <p className="mt-4 text-white/90 text-lg">Let CaseCue become the place where your special education work finally feels organized, connected, and manageable.</p>
          <Link to="/register" className="inline-block mt-8"><Button size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base">See How CaseCue Can Help</Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
            <span className="font-semibold text-foreground">CaseCue</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:contact@getcasecue.com" className="hover:text-foreground">contact@getcasecue.com</a>
            <a href="#demo" className="hover:text-foreground">Book a Demo</a>
            <Link to="/testimonials" className="hover:text-foreground">Testimonials</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/trust" className="hover:text-foreground">Trust &amp; Security</Link>
          </div>
          <p>© {new Date().getFullYear()} CaseCue. Fewer missed deadlines. More time for students.</p>
        </div>
      </footer>
    </div>
  );
}