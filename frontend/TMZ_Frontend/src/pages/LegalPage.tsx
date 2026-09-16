import { useEffect } from 'react';
import { Scale, Mail, MapPin, Globe, ShieldAlert, FileText } from 'lucide-react';

export function LegalPage() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <Scale className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-brand-primary">Legal &amp; Compliance</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-primary font-bold tracking-tight mb-2">
          TERMS AND CONDITIONS
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
          Welcome to <strong className="text-primary font-semibold">The Modern Stories (TMS)</strong>. By accessing, browsing, or interacting with{' '}
          <a
            href="https://www.themodernstories.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            www.themodernstories.in
          </a>
          , you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not accept these terms in full, you must immediately discontinue your use of our platform.
        </p>

        {/* Section 1 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold flex items-center gap-2">
            1. Editorial Content, Public Awareness &amp; General Disclaimer
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Informational &amp; Awareness Purposes:</strong> TMS produces, curates, and disseminates daily news, investigative pieces, analyses, and commentary covering geopolitics, entertainment, lifestyle, and global trends. Our work is intended to foster public awareness, civic discussion, and education.
            </p>
            <p>
              <strong className="text-primary font-medium">No Professional Advice:</strong> All reporting and commentary represent editorial perspectives and situational analyses. They do not constitute legal, financial, medical, or investment advice. Readers are urged to exercise their own discretion and due diligence before making decisions based on any topic covered on this platform.
            </p>
            <p>
              <strong className="text-primary font-medium">Accuracy and Currency:</strong> While our editorial team makes diligent efforts to ensure information is verified and up to date at the time of publication, TMS offers no warranties—express or implied—regarding the absolute accuracy, completeness, or ongoing applicability of any coverage.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            2. Third-Party Advertisements, Sponsored Events, Webinars &amp; Meetups
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Disclaimers for External Promotions:</strong> TMS may display third-party advertisements, promotional banners, event invitations, webinars, workshops, and physical or virtual meetups hosted by external entities or sponsors.
            </p>
            <p>
              <strong className="text-primary font-medium">Sole Organizer Liability:</strong> TMS does not endorse, guarantee, or accept liability for any external event, product, or service promoted on our platform. The sole responsibility for the organization, execution, ticketing, content, legal compliance, safety, and any transactions associated with these events or promotions rests entirely with the designated third-party organizer.
            </p>
            <p>
              <strong className="text-primary font-medium">User Due Diligence:</strong> Any participation, attendance, or financial transaction you enter into with an advertiser or third-party event organizer is conducted strictly at your own risk.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-primary" />
            3. Intellectual Property, Trademark Protection &amp; Anti-Impersonation
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Ownership of Assets:</strong> All original written articles, features, research, graphics, layouts, branding elements, typography, and the name and logo of The Modern Stories (TMS) are the proprietary intellectual property of TMS, protected by copyright, trademark, and unfair competition laws.
            </p>
            <p>
              <strong className="text-primary font-medium">Prohibition Against Misleading Use:</strong> You may not copy, reproduce, scrape, mirror, or republish complete articles without express prior written consent from TMS.
            </p>
            <p>
              <strong className="text-primary font-medium">Legal Recourse for Impersonation:</strong> Any party found misleading the public by spoofing our domain, falsely presenting themselves as TMS, or unauthorizedly utilizing our name, brand identity, or registered logos to deceive readers or trade upon our goodwill will face immediate civil litigation and criminal referral to the fullest extent permitted by law.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-brand-primary" />
            4. Cybercrime, Doxxing &amp; Protection of TMS Personnel
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Zero Tolerance for Targeting Staff:</strong> TMS enforces a zero-tolerance policy against any form of digital harassment, surveillance, cyberstalking, or extortion targeting our writers, editors, administrative staff, or leadership.
            </p>
            <p>
              <strong className="text-primary font-medium">Severe Legal Consequences:</strong> Any malicious activity—including but not limited to attempts to track, harvest, weaponize, or publish (dox) the personal contact details, residential addresses, private communications, or financial data of our personnel, as well as sending direct threats—will be treated as an intentional cybercrime. Such offenses will be referred directly to state and federal law enforcement authorities, accompanied by civil suits for damages and injunctions.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            5. Future Communities, Forums, and Exclusive Meetups
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Confidentiality and Misuse of Group Data:</strong> If TMS establishes private reader communities, subscriber-only forums, discussion panels, or organized physical/virtual meetups in the future, members must maintain mutual respect and confidentiality.
            </p>
            <p>
              <strong className="text-primary font-medium">Sanctions and Legal Action:</strong> If any participant illicitly leaks proprietary community assets, scrapes personal data of fellow participants, or weaponizes discussions held in trust within closed TMS spaces, TMS reserves the absolute authority to immediately terminate access without refund and pursue legal remedies for breach of confidence, privacy invasion, and damages.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            6. Conduct on Social Media, Fair Quotation &amp; Notice to Bad Actors
          </h2>
          <div className="space-y-3 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              <strong className="text-primary font-medium">Healthy Discourse Welcome:</strong> We encourage healthy dialogue, diverse opinions, civic disagreement, and the ethical sharing of our coverage across social media channels and external forums.
            </p>
            <p>
              <strong className="text-primary font-medium">Misrepresentation and Distortion Strictly Prohibited:</strong> We strictly forbid the deliberate distortion, manipulative clipping, decontextualizing, or twisting of TMS reporting to manufacture false narratives, spread propaganda, defame individuals, or deceive the public.
            </p>
            <p>
              <strong className="text-primary font-medium">Notice Regarding Malicious Online Behavior:</strong> Any individual or coordinated group engaged in bad-faith manipulation, coordinated trolling, abusive targeting, harassment, or unlawful attacks using TMS content will face immediate copyright strikes, platform takedown notices, and aggressive legal measures where actionable harm or defamation occurs.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            7. In-Article Interactive Features &amp; Reader Submissions
          </h2>
          <div className="space-y-2 text-sm sm:text-base pl-1 sm:pl-3">
            <p>
              Our articles include interactive prompts, quick-response queries, and sentiment polls to foster reader engagement.
            </p>
            <p>
              Submissions must remain free of hate speech, obscenity, defamation, and unsolicited advertising.
            </p>
            <p>
              TMS reserves the right to review, aggregate, anonymously publish, or purge any user response that compromises editorial standards or site security.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            8. Limitation of Liability
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            Under no circumstances shall TMS, its publishers, affiliates, or contributors be held liable for any direct, indirect, incidental, punitive, or consequential damages resulting from your use of, or inability to access, the content, interactive modules, or third-party links hosted across our network.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            9. Jurisdiction and Enforcement
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            These Terms and Conditions shall be governed by and construed in accordance with the substantive laws of India, Telangana, Hyderabad, Hayathnagar, without regard to conflict of law principles. Any legal proceedings arising from violations of these terms shall fall under the exclusive jurisdiction of the competent courts in Hayathnagar, Hyderabad.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-4 pt-2">
          <h2 className="font-display text-xl text-primary font-semibold">
            10. Contact Information
          </h2>
          <p className="text-sm sm:text-base pl-1 sm:pl-3">
            For editorial queries, rights clearance, community issues, or to report unauthorized use of TMS materials:
          </p>
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-2.5 text-sm sm:text-base ml-1 sm:ml-3"
            style={{
              background: 'var(--bg-glass)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="font-medium text-primary">Legal &amp; Editorial Desk:</span>
              <a
                href="mailto:storiesbytms@gmail.com"
                className="text-brand-primary hover:underline font-semibold"
              >
                storiesbytms@gmail.com
              </a>
            </div>
            <div className="flex items-start gap-2 pt-1">
              <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-1" />
              <div>
                <span className="font-medium text-primary">Mailing Address:</span>
                <p className="text-secondary mt-0.5">
                  The Modern Stories, 3-33/1/2, Road no-2, Shanthi nagar colony, Near Hayath Nagar Depot, Kalvancha, Hyderabad-72, Telangana, India.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
