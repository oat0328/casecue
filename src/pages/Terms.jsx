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

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="September 2026">
      <p>
        These Terms of Service ("Terms") govern your use of CaseCue, a web application for special
        education caseload management, system-assisted IEP drafting support, and progress monitoring
        (the "Service"). By creating an account or using the Service, you agree to these Terms.
      </p>

      <Section heading="1. Your account">
        <p>You must provide accurate information when creating your account and are responsible for keeping your credentials secure. You must be at least 18 years old to use the Service.</p>
      </Section>

      <Section heading="2. Subscription and billing">
        <p>CaseCue is offered on a subscription basis. New accounts start with a 14-day free trial. Unless canceled, your subscription automatically renews at the then-current rate (currently $24.99/month for the Founding Teacher plan). You may cancel at any time; cancellation stops future charges, and you retain access until the end of the paid period. Prices may change with reasonable advance notice.</p>
      </Section>

      <Section heading="3. Authorization and student data">
        <p>You are solely responsible for ensuring that you are authorized by your school, district, or educational organization — and permitted under applicable law, including FERPA and state student-privacy law — to enter, store, and process any student information you provide through the Service. You confirm this authorization in the app before uploading student data.</p>
      </Section>

      <Section heading="4. system-assisted content">
        <p>CaseCue provides system-assisted drafting, review, and question-answering tools. All generated output is a <strong>draft</strong> and requires review by you and, where applicable, the IEP team before use. CaseCue does not make legal, compliance, or educational-placement decisions, and its output does not constitute legal advice. You remain responsible for the accuracy, appropriateness, and compliance of anything you adopt from generated output.</p>
      </Section>

      <Section heading="5. Acceptable use">
        <p>You agree not to use the Service to violate any law or school policy, not to upload data you are not authorized to process, not to attempt to access other users' data, and not to interfere with the Service's operation. We may suspend accounts that violate these Terms.</p>
      </Section>

      <Section heading="6. Intellectual property">
        <p>You retain all rights to the student data and content you enter. CaseCue retains all rights to the Service, its software, and its design. You may not copy, resell, or reverse-engineer the Service except as permitted by law.</p>
      </Section>

      <Section heading="7. Third-party services">
        <p>The Service relies on third-party providers for payment processing and automated processing. Those providers process data only as needed to deliver their function, and are bound by their own privacy and security obligations.</p>
      </Section>

      <Section heading="8. Disclaimers and limitation of liability">
        <p>The Service is provided "as is" without warranties of any kind, except those that cannot be disclaimed by law. To the maximum extent permitted by law, CaseCue is not liable for indirect, incidental, or consequential damages arising from your use of the Service, and its total liability is limited to the amount you paid in the twelve months preceding the claim.</p>
      </Section>

      <Section heading="9. Termination">
        <p>You may stop using the Service and cancel your subscription at any time. We may terminate accounts that breach these Terms. On termination, you can request export or deletion of your data as described in our Privacy Policy.</p>
      </Section>

      <Section heading="10. Changes and contact">
        <p>We may update these Terms from time to time and will post the updated version here with a new "Last updated" date. Continued use after changes means you accept them. Questions? Contact us at <a href="mailto:contact@getcasecue.com" className="text-primary hover:underline">contact@getcasecue.com</a>.</p>
      </Section>
    </LegalShell>
  );
}