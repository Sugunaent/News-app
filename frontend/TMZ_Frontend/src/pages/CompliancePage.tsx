import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrivacyConsent } from '@/lib/usePrivacyConsent';

const PRIVACY_EMAIL = 'storiesbytms@gmail.com';

function requestLink(subject: string): string {
  const body = [
    'Please describe the request (access, correction, deletion, or consent withdrawal).',
    'Account email or profile identifier:',
    'Country/region:',
    '',
    'Please do not include passwords or sensitive identity documents in the first email.',
  ].join('\n');
  return `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function CompliancePage() {
  const { openPrivacySettings } = usePrivacyConsent();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <article className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
      <header className="mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-primary">Privacy, governance &amp; AI transparency</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">Compliance information</h1>
        <p className="mt-3 text-secondary">
          This page explains current product controls and request channels. It is not a legal certification or a substitute for advice on the laws that apply to the site operator.
        </p>
      </header>

      <div className="space-y-6">
        <section className="glass-card space-y-3 p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-primary">Privacy contact and DPO requests</h2>
          <p className="text-sm leading-relaxed text-secondary">
            Send privacy, access, correction, deletion, or consent-withdrawal requests to{' '}
            <a className="font-semibold text-brand-primary underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
            Include the account email and your country/region so the request can be routed. We may ask for proportionate verification before disclosing or deleting account data.
          </p>
          <p className="text-sm leading-relaxed text-secondary">
            This mailbox is the published privacy-request contact. The site does not currently identify a named, formally appointed Data Protection Officer or EU/UK representative; do not treat this contact address as proof of such an appointment. The operator should publish those details if legally required.
          </p>
          <p className="text-sm leading-relaxed text-secondary">
            A complete service-by-service retention schedule and jurisdiction-specific assessment of advertising data use have not yet been published. These are governance items to resolve before representing the platform as certified or fully compliant.
          </p>
        </section>

        <section className="glass-card space-y-4 p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-primary">Exercise a data request</h2>
          <p className="text-sm leading-relaxed text-secondary">
            Use one of these email templates. Requests are handled by the privacy contact, not by an automated deletion service. Signing in may help us locate your reading history, saved stories, XP, badges, and other account-linked activity.
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="btn-secondary px-4 py-2 text-sm" href={requestLink('Personal data access request')}>Request access or correction</a>
            <a className="btn-secondary px-4 py-2 text-sm" href={requestLink('Personal data deletion request')}>Request deletion</a>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Some records may need to be retained for security, legal obligations, or dispute resolution where permitted by applicable law. We will explain any limitation when responding.
          </p>
        </section>

        <section className="glass-card space-y-3 p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-primary">Consent and tracking controls</h2>
          <p className="text-sm leading-relaxed text-secondary">
            Essential storage supports core site operation. Optional advertising, analytics, AI personalization, and push-notification preferences default to off. Google AdSense is loaded only after advertising consent, and advertising stays off if the browser sends a Global Privacy Control opt-out signal. First-party article-view measurement is sent only after analytics consent; no separate third-party analytics tag or AI-based reader personalization is currently configured. Account-linked actions needed to provide features such as comments, sharing, and rewards may still be recorded as part of those features. Choosing a Telugu or Hindi translation is an on-demand translation request, not consent to profile-based personalization.
          </p>
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={openPrivacySettings}>Open privacy choices</button>
        </section>

        <section className="glass-card space-y-3 p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-primary">AI transparency</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-secondary">
            <li>AI-assisted translation may process the article text needed to produce the language version requested by a reader.</li>
            <li>The current site does not provide a reader-facing retrieval-augmented generation (RAG) chatbot or AI-personalized recommendation feature.</li>
            <li>Materially AI-generated or AI-assisted editorial content should be labeled on the relevant story; human editorial review and clear disclosure remain the publisher’s responsibility.</li>
            <li>Do not submit sensitive personal information in public prompts or feedback fields.</li>
          </ul>
        </section>

        <section className="glass-card space-y-3 p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-primary">Regional privacy rights</h2>
          <p className="text-sm leading-relaxed text-secondary">
            Depending on your location and circumstances, GDPR, the CCPA/CPRA, India’s Digital Personal Data Protection Act and rules, or other privacy laws may provide rights such as access, correction, erasure, portability, withdrawal of consent, or opting out of certain advertising uses. The appropriate legal basis, response deadlines, required notices, and available rights depend on the operator, processing, and applicable law; this page does not determine those questions.
          </p>
          <p className="text-sm text-secondary">
            See the <Link className="font-semibold text-brand-primary underline" to="/privacy">Privacy Policy</Link> for current data categories and use the Privacy choices control to change optional consent.
          </p>
        </section>
      </div>
    </article>
  );
}
