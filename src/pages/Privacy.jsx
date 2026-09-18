import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

function LegalShell({ title, updated, children }) {
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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
      </main>
    </div>
  );
}

function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-2">{heading}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="September 2026">
      <p>
        This Privacy Policy explains how CaseCue ("we") collects, uses, and protects information
        when you use the Service. It is written with FERPA-oriented privacy practices in mind; we
        do not claim any certification.
      </p>

      <Section heading="1. Information we collect">
        <p><strong>Account information:</strong> your name, email address, and authentication details.</p>
        <p><strong>Data you enter:</strong> information you choose to store in CaseCue, which may include student records, IEP content, progress data, documents, meetings, lessons, and notes when your organization authorizes that use.</p>
        <p><strong>Usage information:</strong> basic product and security information about how the Service is used, which helps us operate, protect, and improve CaseCue.</p>
      </Section>

      <Section heading="2. How we use information">
        <p>We use your information to operate and maintain your account, provide the Service's features (including system-assisted drafting and review), process payments, provide support, and improve the product. We do not sell your information or your students' information.</p>
      </Section>

      <Section heading="3. Student data and FERPA-oriented practices">
        <p>CaseCue separates records between organizations at the database level. Within an organization, access depends on the workspace and data rules in use; assignment-level minimum-necessary access is still being strengthened before broad school and district deployment. Identifiable student information should be entered only when your school, district, or organization has authorized CaseCue for that purpose.</p>
      </Section>

      <Section heading="4. Assisted processing">
        <p>When you choose an assisted feature such as Ask CaseCue, IEP drafting, document extraction, or review, CaseCue sends the information needed for that request to the processing services used to provide the feature. Generated output is a draft for educator review and should not be treated as a legal, eligibility, placement, or compliance decision.</p>
      </Section>

      <Section heading="5. Sharing with processors">
        <p>We use service providers to operate CaseCue, including hosting/platform infrastructure, payment processing, and assisted-processing services. Student information should be disclosed to a subprocessor only as needed to provide the authorized service and subject to applicable contractual and privacy requirements. A current vendor/subprocessor packet is available to schools and districts on request.</p>
      </Section>

      <Section heading="6. Security">
        <p>We protect data with encryption in transit, row-level access isolation, and audit logging of sensitive actions. No system is perfectly secure; if a security incident affecting your data occurs, we will notify you as required by law.</p>
      </Section>

      <Section heading="7. Data retention">
        <p>We retain data only for the period needed to provide the authorized service or meet applicable legal and contractual requirements. Schools and authorized users can request export, correction, or deletion. For Nevada school-service-provider use, CaseCue's operational policy is to honor an authorized deletion request within the time required by Nevada law, including the 30-day maximum that may apply to pupil PII under NRS 388.292.</p>
      </Section>

      <Section heading="8. Children's privacy">
        <p>CaseCue is a tool for educators. We do not knowingly collect personal information directly from students, and students do not create accounts. Student information in the Service is entered and controlled by authorized educators.</p>
      </Section>

      <Section heading="9. Your rights and contact">
        <p>Depending on your location and role, you may have rights to access, correct, export, or delete information. Parents and eligible students should normally work through their school for education-record requests. Schools and authorized CaseCue users can contact <a href="mailto:contact@getcasecue.com" className="text-primary hover:underline">contact@getcasecue.com</a> for vendor, correction, export, deletion, or security requests.</p>
      </Section>
    </LegalShell>
  );
}