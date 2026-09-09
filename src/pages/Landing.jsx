import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ShieldCheck, FileEdit, MessageCircle, BarChart3, BookOpen,
  ClipboardList, FlaskConical, Check, ArrowRight, Star, Lock, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function Nav() {
  const [open, setOpen] = useState(false);
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
          <a href="#review" className="hover:text-foreground">IEP Review</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/register"><Button size="sm" className="brand-gradient text-white">Start free trial</Button></Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
          <Link to="/login" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full">Sign in</Button></Link>
          <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full brand-gradient text-white">Start free trial</Button></Link>
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
              <Sparkles className="h-3.5 w-3.5" /> The all-in-one SPED operating system
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Your caseload is complicated.<br />
              <span className="text-gradient">CaseCue makes it feel manageable.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              The all-in-one SPED operating system for special education teachers. Write IEPs faster, stay ahead of deadlines, and track every student — all in one calm, connected workspace.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register"><Button size="lg" className="brand-gradient text-white h-12 px-7 text-base">Start 14-Day Free Trial</Button></Link>
              <a href="#product"><Button size="lg" variant="outline" className="h-12 px-7 text-base">See CaseCue in Action</Button></a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">First 50 teachers · $24.99/mo · No credit card to start</p>
          </motion.div>
        </div>
      </section>

      {/* Outcomes */}
      <Section id="outcomes" className="bg-card">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { stat: "4.8 hrs", label: "saved per week on average" },
            { stat: "1 place", label: "for IEPs, data, lessons & meetings" },
            { stat: "0", label: "missed deadlines with smart reminders" },
          ].map((s) => (
            <div key={s.label} className="text-center rounded-2xl border border-border bg-background p-8 card-shadow">
              <div className="text-4xl font-bold text-gradient">{s.stat}</div>
              <div className="mt-2 text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Product demo */}
      <Section id="product">
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

      {/* IEP Review */}
      <Section id="review" className="bg-card">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-3"><ShieldCheck className="h-4 w-4" /> IEP Review</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Catch issues before the meeting.</h2>
            <p className="mt-4 text-muted-foreground">CaseCue reviews an IEP across six categories and flags potential issues — never claiming compliance, always recommending educator verification.</p>
            <ul className="mt-6 space-y-3">
              {["Present Levels", "Goals", "Data Alignment", "Services & Accommodations", "Progress Monitoring", "Document Consistency"].map((c) => (
                <li key={c} className="flex items-center gap-3 text-sm"><Check className="h-4 w-4 text-emerald-500" /> {c}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-background p-6 card-shadow-lg">
            <div className="text-sm font-medium text-muted-foreground">CaseCue IEP Review</div>
            <div className="flex items-end gap-2 mt-1"><span className="text-5xl font-bold text-gradient">87</span><span className="text-muted-foreground mb-1">/ 100</span></div>
            <div className="mt-5 space-y-3">
              {[["Present Levels", 92], ["Goals", 78], ["Data Alignment", 85], ["Services & Accommodations", 96], ["Progress Monitoring", 73], ["Document Consistency", 94]].map(([label, val]) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-semibold">{val}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full brand-gradient" style={{ width: `${val}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">4 items need your attention.</div>
          </div>
        </div>
      </Section>

      {/* Ask CaseCue */}
      <Section id="ask">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-6 card-shadow-lg">
            <div className="flex items-center gap-2 mb-4"><div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div><span className="font-semibold">Ask CaseCue</span></div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-muted p-3">Which students need data this week?</div>
              <div className="rounded-xl brand-gradient text-white p-3 ml-8">Daniel and Aaliyah haven't had progress data logged in 9 days. Want me to open their Data Center?</div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-3"><MessageCircle className="h-4 w-4" /> Ask CaseCue</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ask anything about your caseload.</h2>
            <p className="mt-4 text-muted-foreground">Grounded in your verified student data — and it never invents facts. If information is missing, CaseCue tells you.</p>
          </div>
        </div>
      </Section>

      {/* Progress + Lesson + Sub plans strip */}
      <Section id="more" className="bg-card">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: BarChart3, title: "Progress Monitoring", desc: "Correct/total, percentages, decimals, prompting levels — visualized over time." },
            { icon: BookOpen, title: "Lesson Studio", desc: "Lessons tied to IEP goals with warm-up, I Do / We Do / You Do, and data collection." },
            { icon: ClipboardList, title: "Substitute Plans", desc: "Daily, planned absence, or emergency — pulled from your real schedule and supports." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-background p-6 card-shadow">
              <f.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Practice Lab */}
      <Section id="practice">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-3"><FlaskConical className="h-4 w-4" /> Practice Lab</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Sharpen your skills on fictional students.</h2>
            <p className="mt-4 text-muted-foreground">Practice identifying IEP issues with completely fictional scenarios. Run CaseCue Review, see what you caught and what you missed, and earn a practice score.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 card-shadow-lg text-center">
            <FlaskConical className="h-10 w-10 text-primary mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">Simulation Complete</div>
            <div className="text-4xl font-bold text-gradient mt-1">94 / 100</div>
            <div className="mt-2 text-sm text-muted-foreground">You found 8 of 9 potential issues</div>
          </div>
        </div>
      </Section>

      {/* Privacy & Trust */}
      <Section id="privacy" className="bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Privacy & trust, built in.</h2>
          <p className="mt-4 text-muted-foreground">Designed with FERPA-focused privacy and security controls for authorized education use. Private document storage, row-level access, audit logging, minimum-necessary AI, and data export & deletion.</p>
          <p className="mt-4 text-xs text-muted-foreground italic">CaseCue does not make legal or IEP-team decisions. All AI output is a draft requiring educator review.</p>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, honest pricing.</h2>
          <p className="mt-3 text-muted-foreground">Founding Teacher plan for the first 50 teachers.</p>
        </div>
        <div className="max-w-md mx-auto rounded-2xl border border-primary/20 bg-card p-8 card-shadow-lg">
          <div className="text-sm font-semibold text-primary">Founding Teacher</div>
          <div className="mt-2 flex items-end gap-1"><span className="text-5xl font-bold">$24.99</span><span className="text-muted-foreground mb-2">/ month</span></div>
          <p className="mt-2 text-sm text-muted-foreground">14-day free trial · First 50 teachers</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["IEP Studio & IEP Review", "Students / Caseload", "Progress Monitoring", "Lesson Studio & Substitute Plans", "Meetings & Reports", "Ask CaseCue & Practice Lab", "Time Saved tracking"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> {f}</li>
            ))}
          </ul>
          <Link to="/register"><Button className="w-full mt-8 brand-gradient text-white h-12 text-base">Start 14-Day Free Trial</Button></Link>
        </div>
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
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">Make your caseload feel manageable.</h2>
          <p className="mt-4 text-white/90 text-lg">Join the first 50 Founding Teachers and save hours every week.</p>
          <Link to="/register" className="inline-block mt-8"><Button size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base">Start 14-Day Free Trial</Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
            <span className="font-semibold text-foreground">CaseCue</span>
          </div>
          <p>© {new Date().getFullYear()} CaseCue. Everything SPED, connected.</p>
        </div>
      </footer>
    </div>
  );
}