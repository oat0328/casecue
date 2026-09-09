import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-2">{heading}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

// Public-facing Trust & Security Center: how CaseCue protects student data
// and keeps educators in control. FERPA-aware by design — no certification
// claims are made anywhere on this page.
export default function Trust() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">CaseCue</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Back to homepage</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Trust &amp; Security Center</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How CaseCue protects student data, respects educator judgment, and keeps you in control.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <p>
            CaseCue is built for educators who manage some of the most sensitive data in a school:
            student records, IEPs, evaluations, and progress data. This page explains, in plain
            language, how that data is protected — and what we deliberately never do with it.
          </p>

          <Section heading="Security overview">
            <p>Every account and record in CaseCue is protected by:</p>
            <p>• Encryption of data in transit between your device and our servers.</p>
            <p>• Row-level access controls that isolate your records from every other user&apos;s records.</p>
            <p>• Organization-level isolation for teams, districts, and schools.</p>
            <p>• Audit logging of sensitive actions, including document processing, subscription changes, administrative actions, and document exports (print, PDF, DOCX, Excel, CSV, email, and share).</p>
            <p>No system is perfectly secure. If a security incident affecting your data ever occurs, we will notify you as required by law.</p>
          </Section>

          <Section heading="FERPA-aware design (not a certification)">
            <p>
              CaseCue is designed around FERPA-oriented privacy practices: you only upload records
              you are authorized to access, records are isolated per educator and per organization,
              and every upload surface displays a Protected Student Information notice before you
              upload. We do not claim FERPA certification, and we never market CaseCue as
              &quot;compliant&quot; — compliance decisions belong to your district, not to us.
            </p>
          </Section>

          <Section heading="Row-level privacy & organization isolation">
            <p>Only you (and, if you belong to one, your organization&apos;s members) can see your students&apos; records. Another CaseCue user — even another teacher at the same school using a different account — cannot read, edit, or delete your data. These rules are enforced at the database level on every read, create, update, and delete.</p>
          </Section>

          <Section heading="Role-based access">
            <p>Within an organization, access follows roles: platform and organization administrators can manage members, billing, and audit logs; regular users work with their own and their organization&apos;s student records. Sensitive entities — audit logs, subscriptions, access codes, and billing data — are restricted to administrators.</p>
          </Section>

          <Section heading="Audit logs">
            <p>Sensitive actions are recorded in a tamper-restricted audit log visible only to administrators. Logged actions include logins, document uploads and processing, exports and shares, subscription and billing changes, and administrative actions.</p>
          </Section>

          <Section heading="AI safeguards & the human review model">
            <p>Every AI feature in CaseCue follows one rule: CaseCue assists, educators decide, students come first. Concretely:</p>
            <p>• AI drafts are always labeled as drafts requiring educator review — they are never presented as final, compliant, or certified.</p>
            <p>• AI never invents student facts. When information is missing or conflicting, CaseCue says so instead of guessing.</p>
            <p>• Extracted data shows its source — which document, which page, and a confidence rating — so you can verify everything.</p>
            <p>• AI never makes eligibility or placement decisions, and never replaces the IEP team&apos;s judgment.</p>
            <p>• Exporting AI-generated content requires an explicit acknowledgement that the content is AI-generated and human review is required.</p>
          </Section>

          <Section heading="Data ownership">
            <p>Your data is yours. Student records, documents, goals, lessons, and reports you store in CaseCue belong to you and your organization. We do not sell your data or your students&apos; data, and we do not use it to train models for anyone else&apos;s benefit.</p>
          </Section>

          <Section heading="Data export & deletion">
            <p>You can export your data at any time from Settings, and you can request deletion of your data at any time from Settings or by contacting us. Leaving CaseCue does not lock your records away from you.</p>
          </Section>

          <Section heading="What CaseCue never does">
            <p>• Never claims legal compliance or FERPA certification.</p>
            <p>• Never makes eligibility, placement, or discipline decisions.</p>
            <p>• Never invents student data, statistics, or progress.</p>
            <p>• Never presents AI output as final without educator review.</p>
          </Section>

          <Section heading="Questions or concerns">
            <p>
              If you have a security question, want to report an issue, or need help with data
              export or deletion, contact us at{" "}
              <a href="mailto:contact@getcasecue.com" className="text-primary hover:underline">contact@getcasecue.com</a>.
              See also our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}