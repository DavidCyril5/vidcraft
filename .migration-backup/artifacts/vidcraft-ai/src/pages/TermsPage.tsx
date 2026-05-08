import React from 'react';
import Navbar from '@/components/Navbar';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-white">{title}</h2>
    <div className="text-sm text-white/70 leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl relative z-10">
        <div className="mb-10">
          <h1 className="text-4xl font-headline font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 2025 &nbsp;·&nbsp; Effective immediately</p>
        </div>

        <div className="glass-morphism rounded-2xl border border-white/10 p-8 space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>By accessing or using VidCraft AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>VidCraft AI provides AI-powered video generation using third-party neural models including Veo 3.1, Wan 2.2, Grok Video, and Seedance 2.0. Output quality depends on the underlying AI providers and may vary.</p>
            <p>Video generation typically takes 3–6 minutes. Credits are consumed at generation start. If generation fails, credits are automatically refunded to your account.</p>
          </Section>

          <Section title="3. Accounts & Credits">
            <p>You must register an account to use the Service. You are responsible for maintaining the security of your account credentials.</p>
            <p>Free accounts receive 3 starter credits and may claim 1 additional Wan 2.2 credit per day. Paid plans provide monthly credits as described on the Pricing page.</p>
            <p>Credits are non-transferable and expire at the end of each billing cycle for paid plans. Unused free credits do not expire.</p>
          </Section>

          <Section title="4. Payments">
            <p>Payments are processed by Paystack in Nigerian Naira (₦). Plans are billed monthly. You may cancel at any time, but we do not offer refunds for partial months or unused credits.</p>
            <p>If your payment fails, your account will be downgraded to the Free plan at the end of the current billing period.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You may not use VidCraft AI to generate content that is illegal, defamatory, hateful, sexually explicit involving minors, or violates any third-party intellectual property rights.</p>
            <p>You may not attempt to reverse-engineer, scrape, or abuse the API. Rate limits and security measures are in place and must not be circumvented.</p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>You retain ownership of the prompts you create. Generated videos are provided for your personal and commercial use, subject to the terms of the underlying AI providers.</p>
            <p>VidCraft AI retains all rights to the platform, codebase, branding, and user interface.</p>
          </Section>

          <Section title="7. Privacy">
            <p>We store your account information, generation history, and payment records. We do not sell your data to third parties. Payments are processed by Paystack; we do not store card details.</p>
            <p>We may use anonymised usage data to improve the service. You may request deletion of your account and data by contacting support.</p>
          </Section>

          <Section title="8. Disclaimer & Limitation of Liability">
            <p>The Service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
            <p>Our total liability shall not exceed the amount you paid us in the 3 months preceding the claim.</p>
          </Section>

          <Section title="9. Changes to Terms">
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. Material changes will be communicated via email or in-app notice.</p>
          </Section>

          <Section title="10. Contact">
            <p>For questions about these Terms, contact us at <a href="/contact" className="text-primary hover:text-primary/80">support@vidcraft.ai</a>.</p>
          </Section>
        </div>
      </main>
    </div>
  );
}
