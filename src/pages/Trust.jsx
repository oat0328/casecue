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
            <p>• Database access rules and organization boundaries that separate one organization&apos;s records from another&apos;s.</p>
            <p>• Organization-level isolation for teams, districts, and schools.</p>
            <p>• Audit logging is used for sensitive workflows such as document processing, subscription changes, administrative actions, parent sharing, and supported export flows.</p>
            <p>No system is perfectly secure. If a security incident affecting your data ever occurs, we will notify you as required by law.</p>
          </Section>

          <Section heading="FERPA-aware design (not a certification)">
            <p>
              CaseCue is designed around FERPA-oriented privacy practices: identifiable student records should be used only with school or district authorization, organizations are separated at the database level, and designated student-record upload workflows display a Protected Student Information notice before you upload. We do not claim FERPA certification, and we never market CaseCue as
              &quot;compliant&quot; — compliance decisions belong to your district, not to us.
            </p>
          </Section>

          <Section heading="School approval and identifiable student data">
            <p>Educators can explore CaseCue with demo or de-identified information. Before entering personally identifiable student information, users should follow their school, district, or organization&apos;s approval process for third-party software.</p>
            <p>CaseCue is developing school-approval resources, vendor documentation, organization controls, and administrator workflows. These tools are not represented as school or district approval, and requesting access does not activate or imply authorization.</p>
            <p><a href="mailto:contact@getcasecue.com?subject=CaseCue%20School%20Access%20Request" className="text-primary hover:underline">Request school access or vendor information</a>.</p>
          </Section>

          <Section heading="Row-level privacy & organization isolation">
            <p>CaseCue separates records between organizations at the database level. Users outside your organization cannot access your organization&apos;s student records through normal application access. Within an organization, some student entities are currently organization-scoped; assignment-level access is being tightened before broad school and district rollout.</p>
          </Section>

          <Section heading="Access controls">
            <p>CaseCue uses organization separation, workspace controls, and database rules to restrict access. Administrator-only entities such as audit logs, subscriptions, access codes, and billing data are separately restricted. Assignment-level, minimum-necessary student access is being strengthened before broad school and district rollout.</p>
          </Section>

          <Section heading="Audit logs">
            <p>Sensitive workflows are written to administrator-restricted audit records. Current logging includes account events, document-processing actions, family sharing, subscription and billing changes, and supported export/admin workflows. Audit coverage is being expanded as the beta grows.</p>
          </Section>

          <Section heading="Assisted-processing safeguards & the human review model">
            <p>Every assisted feature in CaseCue follows one rule: CaseCue assists, educators decide, students come first. Concretely:</p>
            <p>• generated drafts are always labeled as drafts requiring educator review — they are never presented as final, compliant, or certified.</p>
            <p>• The system never invents student facts. When information is missing or conflicting, CaseCue says so instead of guessing.</p>
            <p>• Where source-aware extraction is available, CaseCue keeps source context so educators can verify what the system used instead of treating generated text as ground truth.</p>
            <p>• The system never makes eligibility or placement decisions, and never replaces the IEP team&apos;s judgment.</p>
            <p>• Exporting system-assisted content requires an explicit acknowledgement that the content is system-generated and human review is required.</p>
          </Section>

          <Section heading="Data ownership">
            <p>Your data is yours. Student records, documents, goals, lessons, and reports you store in CaseCue belong to you and your organization. We do not sell your data or your students&apos; data, and we do not use it to train models for anyone else&apos;s benefit.</p>
          </Section>

          <Section heading="Data export & deletion">
            <p>Authorized users can export supported records and request deletion or correction. For Nevada school-service-provider use, CaseCue is being aligned to the state requirement to delete pupil PII within the applicable statutory window after an authorized request and to provide breach notice without unreasonable delay.</p>
          </Section>

          <Section heading="What CaseCue never does">
            <p>• Never claims legal compliance or FERPA certification.</p>
            <p>• Never makes eligibility, placement, or discipline decisions.</p>
            <p>• Never invents student data, statistics, or progress.</p>
            <p>• Never presents generated output as final without educator review.</p>
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