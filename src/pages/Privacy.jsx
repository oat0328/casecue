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
        <p><strong>Data you enter:</strong> student records, IEP content, progress data, documents, meetings, lessons, and notes that you choose to store in the Service.</p>
        <p><strong>Usage information:</strong> basic analytics about how features are used, which help us improve the Service.</p>
      </Section>

      <Section heading="2. How we use information">
        <p>We use your information to operate and maintain your account, provide the Service's features (including AI-assisted drafting and review), process payments, provide support, and improve the product. We do not sell your information or your students' information.</p>
      </Section>

      <Section heading="3. Student data and FERPA-oriented practices">
        <p>Student information you enter is stored so you can manage your caseload. Each teacher's records are isolated from other users' records through row-level access controls — other CaseCue users cannot see your students. You confirm you are authorized by your school, district, or organization to process this data. If your school directs you to stop using the Service, you can export or request deletion of your data at any time from Settings.</p>
      </Section>

      <Section heading="4. AI processing">
        <p>When you use AI features (Ask CaseCue, IEP Studio drafting, IEP Review), the minimum necessary student context is sent to our AI provider to generate a response. AI output is a draft for educator review. Full-document AI processing is off by default and only enabled by you.</p>
      </Section>

      <Section heading="5. Sharing with processors">
        <p>We share data only with service providers that help us run the Service: a payment processor (for billing) and an AI provider (for AI features). These providers process data on our behalf and cannot use it for their own purposes.</p>
      </Section>

      <Section heading="6. Security">
        <p>We protect data with encryption in transit, row-level access isolation, and audit logging of sensitive actions. No system is perfectly secure; if a security incident affecting your data occurs, we will notify you as required by law.</p>
      </Section>

      <Section heading="7. Data retention">
        <p>We retain your data while your account is active. You can export your data at any time from Settings, and you can request deletion of your data at any time from Settings or by contacting support.</p>
      </Section>

      <Section heading="8. Children's privacy">
        <p>CaseCue is a tool for educators. We do not knowingly collect personal information directly from students, and students do not create accounts. Student information in the Service is entered and controlled by authorized educators.</p>
      </Section>

      <Section heading="9. Your rights and contact">
        <p>Depending on your location, you may have rights to access, correct, export, or delete your personal information. You can exercise these from Settings (Data Export and Data Deletion) or by contacting us at <a href="mailto:contact@getcasecue.com" className="text-primary hover:underline">contact@getcasecue.com</a>.</p>
      </Section>
    </LegalShell>
  );
}