import { useEffect } from 'react';
import { Shield, Mail, Globe, Lock } from 'lucide-react';

export function PrivacyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12">
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
        <p className="text-sm text-muted mt-1">Last Updated: 14-09-2026</p>
      </div>

      {/* Main Content Box */}
      <div
        className="rounded-2xl p-6 sm:p-10 space-y-8 text-secondary leading-relaxed border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Intro */}
        <p className="text-base sm:text-lg text-primary leading-relaxed">
          At <strong className="text-primary font-semibold">The Modern Stories (TMS)</strong>, accessible via{' '}
          <a
            href="https://www.themodernstories.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            www.themodernstories.in
          </a>
          , we take your personal data seriously. This Privacy Policy outlines what information we collect when you read our coverage of geopolitical affairs, entertainment, lifestyle, and trending news, how we handle user interactions, and the choices you have regarding your data.
        </p>

        {/* Section 1 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold flex items-center gap-2">
            1. Information We Collect
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Directly Provided Information:</strong> When you subscribe to our newsletter, submit answers to in-article interactive prompts, submit commentary, or contact our editorial desk, you may provide details such as your name, email address, and individual responses.
            </p>
            <p>
              <strong className="text-primary font-medium">Interactive Engagement Data:</strong> Our articles feature integrated prompts and polls designed to gauge reader sentiment. Responses submitted through these prompts are aggregated to display overall trends and are not linked to your identity unless you choose to submit them under a registered profile.
            </p>
            <p>
              <strong className="text-primary font-medium">Automated Device and Analytics Data:</strong> When you browse our site, we automatically log basic technical data, including your IP address, browser type, device information, referring URLs, and dwell time. This allows us to ensure website stability and analyze which topics resonate with our readers.
            </p>
            <p>
              <strong className="text-primary font-medium">Cookies and Tracking Technologies:</strong> We use standard browser cookies to remember your site preferences, measure traffic, and serve contextual content and advertisements. You can disable cookies directly through your individual browser settings.
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
            <li>To compile anonymous, aggregated statistics from reader polls and interactive questions.</li>
            <li>To deliver newsletters, updates, or editorial alerts if you have explicitly opted in.</li>
            <li>To detect and prevent spam, abusive behavior, and unauthorized access.</li>
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
            We do not sell, rent, or trade your personal information. We share minimal data only with vetted infrastructure partners (such as secure hosting providers and email delivery platforms) strictly necessary to run the website, or when required by lawful legal process.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            5. Data Retention and Your Rights
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            We store personal details only as long as necessary to fulfill the editorial services requested. You have the right to request access to the data we hold about you, request corrections, or ask for deletion of your information by contacting our privacy desk at{' '}
            <a
              href="mailto:storiesbytms@gmail.com"
              className="text-brand-primary hover:underline font-semibold inline-flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5 inline" />
              storiesbytms@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
