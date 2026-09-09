import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ShieldCheck, FileEdit, MessageCircle, BarChart3, BookOpen,
  ClipboardList, FlaskConical, Check, Lock, Menu, Users, CalendarClock,
  UsersRound, LayoutDashboard
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

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 brand-gradient-soft" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Case management software for special education
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Stay Compliant. Stay Organized.<br />
              <span className="text-gradient">Serve Students Better.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              CaseCue helps special education teachers and case managers track IEP deadlines, manage student records, organize meetings, and stay compliant from one simple dashboard.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register"><Button size="lg" className="brand-gradient text-white h-12 px-7 text-base">Start Free Trial</Button></Link>
              <a href="#demo"><Button size="lg" variant="outline" className="h-12 px-7 text-base">Book a Demo</Button></a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">14-day free trial · No credit card to start</p>
          </motion.div>
        </div>
      </section>

      {/* Promo video */}
      <Section id="video" className="pt-0 sm:pt-0">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">See CaseCue in action.</h2>
          <p className="mt-3 text-muted-foreground">One calm workspace for your entire caseload.</p>
        </div>
        <div className="rounded-2xl border border-border card-shadow-lg overflow-hidden max-w-4xl mx-auto">
          <video
            src="https://media.base44.com/videos/public/6aa0ab4a6f88297dfb76d459/dbba7b5b0_CaseCue_Promo_Video.mp4"
            controls
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video bg-black"
            aria-label="CaseCue product overview video"
          />
        </div>
      </Section>

      {/* Problem */}
      <Section id="problem" className="bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Tired of managing your caseload in multiple places?</h2>
          <p className="mt-4 text-muted-foreground">Special education professionals juggle:</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {["IEP deadlines", "Reevaluation timelines", "Meeting notes", "Compliance requirements", "Student documentation", "Parent communication"].map((p) => (
              <div key={p} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                {p}
              </div>
            ))}
          </div>
          <p className="mt-8 text-lg font-semibold">One missed deadline can create unnecessary stress.</p>
          <p className="mt-2 text-muted-foreground">
            CaseCue keeps everything organized in one place.{" "}
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything SPED, connected.</h2>
          <p className="mt-3 text-muted-foreground">One workspace replaces the scattered spreadsheets, sticky notes, and shared drives.</p>
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
          <p className="mt-4 text-muted-foreground">Designed with FERPA-focused privacy and security controls for authorized education use. Private document storage, row-level access, audit logging, minimum-necessary AI, and data export & deletion.</p>
          <p className="mt-4 text-xs text-muted-foreground italic">CaseCue does not make legal or IEP-team decisions. All AI output is a draft requiring educator review.</p>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" className="bg-card">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, honest pricing.</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when it earns its place in your day.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start max-w-5xl mx-auto">
          {[
            {
              name: "Starter", price: "$19", period: "/month", tagline: "Perfect for individual educators",
              items: ["Up to 50 students", "Deadline tracking", "Dashboard", "Notes and documentation", "Email support"],
              cta: "Start Free Trial", href: "/register", highlight: false,
            },
            {
              name: "Professional", price: "$49", period: "/month", tagline: "For larger caseloads and power users",
              items: ["Unlimited students", "Advanced reporting", "Priority support", "Compliance tools", "Future feature access"],
              cta: "Start Free Trial", href: "/register", highlight: true,
            },
            {
              name: "District", price: "Custom", period: "", tagline: "For schools and districts",
              items: ["Multi-user access", "Admin dashboard", "District-wide reporting", "Training", "Custom onboarding"],
              cta: "Book a Demo", href: "#demo", highlight: false,
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-7 card-shadow relative ${tier.highlight ? "border-primary/40 bg-background md:-mt-3 md:pb-10 card-shadow-lg" : "border-border bg-background"}`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-1 text-xs font-semibold text-white">Most popular</div>
              )}
              <div className="text-sm font-semibold text-primary">{tier.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.period && <span className="text-muted-foreground mb-1.5">{tier.period}</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {tier.items.map((item) => (
                  <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> {item}</li>
                ))}
              </ul>
              {tier.href.startsWith("#") ? (
                <a href={tier.href}><Button variant="outline" className="w-full mt-7 h-11">{tier.cta}</Button></a>
              ) : (
                <Link to={tier.href}><Button className="w-full mt-7 brand-gradient text-white h-11">{tier.cta}</Button></Link>
              )}
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <span className="font-semibold text-foreground">Launching now — Founding Teacher beta:</span> $24.99/month gets you everything in Professional, locked in for early adopters. 14-day free trial, no credit card.
        </p>
      </Section>

      {/* Demo */}
      <Section id="demo">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Book a Demo</h2>
          <p className="mt-3 text-muted-foreground">See CaseCue with your own caseload in mind — we'll walk you through it personally.</p>
        </div>
        <DemoRequestForm />
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10">Frequently asked questions</h2>
          <Accordion type="single" collapsible>
            {[
              { q: "Does CaseCue write legal IEPs?", a: "No. CaseCue drafts IEP sections to support your work, but every AI output is labeled 'Draft — Educator/IEP Team Review Required.' CaseCue never makes legal or IEP-team decisions." },
              { q: "Is CaseCue FERPA certified?", a: "CaseCue is designed with FERPA-focused privacy and security controls for authorized education use. We do not claim certification. You confirm authorization before uploading student data." },
              { q: "Will AI invent facts about my students?", a: "No. Ask CaseCue only uses your verified records. If information is missing, it tells you it doesn't have enough to answer." },
              { q: "Can I export or delete my data?", a: "Yes. Settings includes data export and data deletion requests, plus retention controls." },
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
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">Ready to simplify case management?</h2>
          <p className="mt-4 text-white/90 text-lg">Stop chasing spreadsheets and start focusing on students.</p>
          <Link to="/register" className="inline-block mt-8"><Button size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base">Start Your Free Trial Today</Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
            <span className="font-semibold text-foreground">CaseCue</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#demo" className="hover:text-foreground">Book a Demo</a>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
          <p>© {new Date().getFullYear()} CaseCue. Stay compliant. Stay organized.</p>
        </div>
      </footer>
    </div>
  );
}