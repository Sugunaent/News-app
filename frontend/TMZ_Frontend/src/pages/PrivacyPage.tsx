import { useEffect } from 'react';
import { Shield, Mail, Globe, Lock } from 'lucide-react';
import { usePrivacyConsent } from '@/lib/usePrivacyConsent';

export function PrivacyPage() {
  const { openPrivacySettings } = usePrivacyConsent();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-brand-primary">Legal &amp; Trust</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-primary font-bold tracking-tight mb-2">
          PRIVACY POLICY
        </h1>
        <p className="text-base text-secondary font-medium">The Modern Stories (TMS)</p>
        <p className="text-sm text-muted mt-1">Last reviewed: 12 November 2026</p>
      </div>

      {/* Main Content Box */}
      <div
        className="rounded-2xl p-6 sm:p-10 space-y-[50px] md:space-y-[100px] text-secondary leading-relaxed border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Intro */}
        <p className="text-base sm:text-lg text-primary leading-relaxed">
          At <strong className="text-primary font-semibold">The Modern Stories (TMS)</strong>, accessible via{' '}
          <a
            href="https://themodernstories.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            themodernstories.in
          </a>
          , we take your personal data seriously. This policy explains the information processed when you use our stories, account, and interactive features, and the choices available to you. It is a product disclosure, not a legal opinion or a certification of compliance.
        </p>

        {/* Section 1 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold flex items-center gap-2">
            1. Information We Collect
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Information you provide:</strong> Depending on the features you use, you may provide a name, email address, account details, comments, or responses to interactive article prompts.
            </p>
            <p>
              <strong className="text-primary font-medium">Account and engagement data:</strong> If you sign in, reading progress, completion status, saved items, XP, badges, and interactive responses may be associated with your account to provide profile and gamification features. Publicly displayed poll results may be aggregated; do not assume that an individual response is anonymous.
            </p>
            <p>
              <strong className="text-primary font-medium">Technical and operational data:</strong> Our hosting, API, and security services may process technical request data (such as IP address, browser headers, and request time) to deliver the site, prevent abuse, and troubleshoot errors. First-party article-view measurement is recorded only when you enable analytics in Privacy choices; no separate third-party analytics tag is currently configured.
            </p>
            <p>
              <strong className="text-primary font-medium">Storage and optional technologies:</strong> Essential browser storage supports account sessions and privacy choices. Optional Google AdSense and push-notification scripts are not loaded unless you opt in to those categories. You can review or withdraw optional choices at any time using the Privacy choices control below.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            2. How We Use Your Data
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm sm:text-base pl-1 sm:pl-3 text-secondary">
            <li>To deliver, maintain, and refine our daily editorial content.</li>
            <li>To display and analyze responses to reader polls and interactive questions, which may be associated with an account.</li>
            <li>To deliver newsletters, updates, or editorial alerts if you have explicitly opted in.</li>
            <li>To detect and prevent spam, abusive behavior, and unauthorized access.</li>
            <li>To maintain reading progress and rewards when you choose to use an account.</li>
            <li>To measure article readership only when you opt in to analytics; account-linked actions needed to provide features such as comments, sharing, or rewards may be recorded separately.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            3. Third-Party Services and External Links
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            Our reporting regularly includes links to third-party sources, external references, and embedded multimedia (such as video feeds or social media widgets). TMS does not control the privacy practices or data policies of these external platforms. We encourage you to review their independent policies upon leaving our site.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-primary" />
            4. Data Sharing and Disclosure
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            Data may be processed by service providers that support hosting, authentication, content delivery, advertising, or notifications, and may be disclosed when legally required. Google AdSense can involve third-party advertising processing when enabled. The site has not published a jurisdiction-specific determination of whether that processing constitutes a sale or sharing under every applicable law; advertising is off unless selected in Privacy choices, and a browser Global Privacy Control signal disables it.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            5. Data Retention and Your Rights
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            A service-by-service retention schedule has not yet been published. To request access, correction, or deletion, contact the privacy-request mailbox at{' '}
            <a
              href="mailto:storiesbytms@gmail.com"
              className="text-brand-primary hover:underline font-semibold inline-flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5 inline" />
              storiesbytms@gmail.com
            </a>
            .
          </p>
          <p className="text-sm text-secondary">
            The published mailbox is a privacy contact channel and is not confirmation that a statutory DPO has been appointed. See <a className="font-semibold text-brand-primary underline" href="/compliance">Compliance &amp; AI transparency</a> for request instructions and current governance disclosures.
          </p>
        </section>
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">6. AI-assisted features</h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            When you request a Telugu or Hindi translation, article text may be processed by an AI translation service to provide that translation. Translation is an on-demand feature, not reader-profile personalization. Our current site does not offer a reader-facing RAG chatbot or AI-personalized recommendation system. Where an article is materially AI-generated or AI-assisted, the editorial team should identify that on the article; not every article uses AI. Do not enter sensitive personal information into public forms or article prompts.
          </p>
        </section>
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">7. Privacy choices and regional rights</h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            We use the same opt-in default worldwide rather than estimating your location from your IP address. Depending on your location, applicable rights may include access, correction, deletion, portability, withdrawal of consent, or opting out of certain advertising uses. Use the controls here or contact our privacy-request mailbox. We may need to verify your identity before acting.
          </p>
          <button type="button" onClick={openPrivacySettings} className="btn-secondary px-4 py-2 text-sm">Review privacy choices</button>
        </section>
      </div>
    </div>
  );
}
