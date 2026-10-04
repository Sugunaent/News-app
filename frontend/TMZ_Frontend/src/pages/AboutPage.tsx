import { useEffect } from 'react';
import { ContactSection } from '@/components/common/ContactSection';
import { GlowingEffect } from '@/components/articles/GlowingEffect';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { removeJsonLd, upsertJsonLd } from '@/lib/seo';
import { useLanguage } from '@/lib/language';
import { useTranslatedArticle } from '@/lib/translations';

interface TeamMemberItem {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  object_position?: string; // Added to fine-tune focal points per photo
}

const TEAM_MEMBERS: TeamMemberItem[] = [
  {
    id: 'tm-1',
    name: 'Tolety Mohana Shyam',
    role: 'Founder',
    bio: 'At The Modern Stories, we look past the obvious to bring you the conversations that truly matter. Step beyond the bias, think critically, and see the world from a different lens.',
    image_url: '/Shyam-PP.png',
    object_position: 'center 20%', // Keeps head centered
  },
  {
    id: 'tm-2',
    name: 'Chinta Suguna Vanditha',
    role: 'Content Writer',
    bio: 'The Modern Stories explores the overlooked narratives of our world with honesty and nuance. Rather than telling you what to think, it invites you to look closer and see every story differently.',
    image_url: '/Suguna-PP.png',
    object_position: 'center 20%', // Focuses on face
  },
  {
    id: 'tm-3',
    name: 'Sree Keerthana Gorty',
    role: 'Sr. Business Analyst',
    bio: 'A go to platform for modern ideas in modern platform having modern people!',
    image_url: '/Keerthana-PP.jpeg',
    object_position: 'center top', // Crucial: Fixes chin-crop issue by anchoring at the top
  },
  {
    id: 'tm-4',
    name: 'Indira Pagadala',
    role: 'AI-ML Engineer',
    bio: "Built with thoughtful journalism in mind, The Modern Stories is the perfect way to stay updated in today's world",
    image_url: '/Indira-PP.JPG',
    object_position: '52% 25%', // Centers directly on Indira in the wide classroom photo
  },
];

const FAQ_ITEMS = [
  {
    question: 'What is The Modern Stories?',
    answer: 'The Modern Stories is an editorial platform that presents articles as interactive reading experiences.',
  },
  {
    question: 'What can readers do on the platform?',
    answer: 'Readers can explore articles and, where available, take quizzes, share opinions, listen to podcasts, and earn reading-progress rewards.',
  },
  {
    question: 'What is the editorial approach?',
    answer: 'The Modern Stories encourages readers to question narratives, consider different perspectives, and engage with stories without being told what to think.',
  },
];

const ABOUT_COPY: Record<string, string> = {
  home: 'Home',
  about: 'About',
  heading: 'About The Modern Stories',
  quote: '“We are drowning in information, but starving for truth.”',
  introduction: 'Let’s be completely honest for a second. Every single day, we’re handed dry, robotic “news” that tells us what to think instead of helping us understand why it matters. Headlines are weaponized for clicks. Algorithms feed us echo chambers. Education is often treated like memorizing someone else’s script, and the media prefers taking sides over telling the truth.',
  founded: 'We got tired of it. That’s why we built The Modern Stories.',
  mottoLabel: 'Our Motto',
  motto: '“Break through the Bias.”',
  mottoCaption: '(Because the truth shouldn’t come with an agenda.)',
  whereWeStand: 'Where We Stand',
  opinionsHeading: 'Opinions over robotic news',
  opinionsText: 'Dry stats don’t build understanding; real, lived experiences do. When people share perspectives openly, echo chambers break and the actual truth emerges.',
  freedomHeading: 'Freedom to think, not just consume',
  freedomText: 'True learning isn’t memorizing someone else’s script—it’s the freedom to question narratives and find your own voice.',
  respectHeading: 'Respecting your intelligence',
  respectText: 'No manufactured outrage, no hidden PR agendas, and no sugarcoating. Just honest, grounded realities.',
  whatDrivesUs: 'What Drives Us',
  honestyHeading: 'Radical Honesty',
  honestyText: 'Nuance matters more than viral hype.',
  humanHeading: 'Human First',
  humanText: 'Real struggles and authentic growth over algorithmic trends.',
  disagreementHeading: 'Open Disagreement',
  disagreementText: 'We believe healthy minds don’t always agree, but they talk like adults.',
  echoHeading: 'You Don’t Belong in an Echo Chamber.',
  echoText: 'Whether you’re here to unlearn, share an unconventional thought, or read without being manipulated:',
  welcome: 'Welcome to The Modern Stories.',
  thinkFreely: 'Think freely',
  speakHonestly: 'Speak honestly',
  breakBias: 'Break through the bias',
  company: 'Our Company',
  companyTextOne: 'We believe reading should be an experience, not a chore. Our team of editors, engineers, and designers have built a platform that transforms articles into interactive journeys — with quizzes, opinions, podcasts, and progressive reading unlocks that reward curiosity.',
  companyTextTwo: 'Every article on The Modern Stories is crafted to inform, challenge, and inspire. We combine editorial rigor with modern technology to create a reading experience that feels alive.',
  team: 'Meet the Team',
  faq: 'Frequently asked questions',
};

const ABOUT_TRANSLATION_SEGMENTS = {
  ...ABOUT_COPY,
  ...Object.fromEntries(
    TEAM_MEMBERS.flatMap((member) => [
      [`team-role-${member.id}`, member.role],
      [`team-bio-${member.id}`, member.bio],
    ]),
  ),
  ...Object.fromEntries(
    FAQ_ITEMS.flatMap((item, index) => [
      [`faq-question-${index}`, item.question],
      [`faq-answer-${index}`, item.answer],
    ]),
  ),
};

export function AboutPage() {
  const { currentLang } = useLanguage();
  const translation = useTranslatedArticle(
    'about-page-static',
    '',
    '',
    ABOUT_TRANSLATION_SEGMENTS,
    { enabled: currentLang !== 'EN' },
  );
  const t = (key: string) => translation.segments[key] || ABOUT_COPY[key] || key;

  useEffect(() => {
    upsertJsonLd('about-faq-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    });
    return () => removeJsonLd('about-faq-jsonld');
  }, []);

  return (
    <div lang={currentLang.toLowerCase()} className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 space-y-[50px] md:space-y-[100px]">
      <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: t('about') }]} />
      {/* About The Modern Stories */}
      <section className="w-full space-y-[50px] md:space-y-[100px]">
        {/* Main Heading & Lead */}
        <div className="text-center w-full max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-6 leading-relaxed">{t('heading')}</h1>
          <p className="font-display text-2xl md:text-3xl text-brand-primary mb-6 leading-snug">
            {t('quote')}
          </p>
          <div className="space-y-4 text-secondary text-base md:text-lg leading-relaxed text-left md:text-center">
            <p>{t('introduction')}</p>
            <p className="font-medium text-primary text-lg md:text-xl">{t('founded')}</p>
          </div>
        </div>

        {/* Our Motto Banner */}
        <div className="glass-card p-8 md:p-10 text-center w-full max-w-3xl mx-auto border-brand-primary/30">
          <span className="text-xs uppercase tracking-widest text-brand-primary font-semibold block mb-2">{t('mottoLabel')}</span>
          <h2 className="font-display text-3xl md:text-4xl text-primary mb-3">
            {t('motto')}
          </h2>
          <p className="text-sm md:text-base text-muted italic">
            {t('mottoCaption')}
          </p>
        </div>

        {/* Where We Stand & What Drives Us Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Where We Stand */}
          <div className="glass-card p-8 md:p-10 space-y-6">
            <h2 className="font-display text-2xl text-primary flex items-center gap-3">
              <span className="w-2 h-6 bg-brand-primary rounded-full inline-block"></span>
              {t('whereWeStand')}
            </h2>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">{t('opinionsHeading')}</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">{t('opinionsText')}</p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">{t('freedomHeading')}</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">{t('freedomText')}</p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">{t('respectHeading')}</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">{t('respectText')}</p>
              </div>
            </div>
          </div>

          {/* What Drives Us */}
          <div className="glass-card p-8 md:p-10 space-y-6">
            <h2 className="font-display text-2xl text-primary flex items-center gap-3">
              <span className="w-2 h-6 bg-brand-accent rounded-full inline-block"></span>
              {t('whatDrivesUs')}
            </h2>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">{t('honestyHeading')}</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">{t('honestyText')}</p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">{t('humanHeading')}</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">{t('humanText')}</p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">{t('disagreementHeading')}</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">{t('disagreementText')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* You Don't Belong in an Echo Chamber */}
        <div className="glass-card p-8 md:p-12 text-center w-full">
          <h2 className="font-display text-2xl md:text-3xl text-primary mb-4 leading-relaxed">{t('echoHeading')}</h2>
          <p className="text-secondary text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">{t('echoText')}</p>
          <p className="font-display text-xl md:text-2xl text-brand-primary mb-4">{t('welcome')}</p>
          <div className="flex flex-wrap justify-center items-center gap-3 text-sm md:text-base font-medium text-primary">
            <span className="px-4 py-1.5 rounded-full bg-surface-secondary border border-border">{t('thinkFreely')}</span>
            <span className="text-muted">•</span>
            <span className="px-4 py-1.5 rounded-full bg-surface-secondary border border-border">{t('speakHonestly')}</span>
            <span className="text-muted">•</span>
            <span className="px-4 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/30">{t('breakBias')}</span>
          </div>
        </div>
      </section>

      {/* About the Company */}
      <section className="w-full">
        <div className="glass-card p-8 md:p-12 w-full">
          <h2 className="font-display text-3xl text-primary mb-6">{t('company')}</h2>
          <div className="space-y-5 text-secondary text-base md:text-lg leading-relaxed">
            <p>{t('companyTextOne')}</p>
            <p>{t('companyTextTwo')}</p>
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      <section>
        <h2 className="font-display text-3xl text-primary text-center mb-10">{t('team')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.id} className="relative glass-card overflow-hidden group flex flex-col h-full">
              <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
              
              {/* Responsive image wrapper with fixed aspect ratio to prevent clipping */}
              <div className="relative w-full aspect-[4/5] overflow-hidden bg-surface-secondary">
                {member.image_url && (
                  <img
                    src={member.image_url}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: member.object_position || 'center top' }}
                    loading="lazy"
                  />
                )}
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-display text-lg text-primary">{member.name}</h3>
                <p className="text-sm text-brand-primary mb-2 font-medium">{translation.segments[`team-role-${member.id}`] || member.role}</p>
                <p className="text-xs text-muted leading-relaxed flex-1">{translation.segments[`team-bio-${member.id}`] || member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-faq-heading" className="w-full max-w-4xl mx-auto">
        <h2 id="about-faq-heading" className="font-display text-3xl text-primary mb-6">{t('faq')}</h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map(({ question, answer }, index) => (
            <details key={question} className="glass-card p-5">
              <summary className="cursor-pointer font-semibold text-primary">
                {translation.segments[`faq-question-${index}`] || question}
              </summary>
              <p className="mt-3 leading-relaxed text-secondary">
                {translation.segments[`faq-answer-${index}`] || answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <ContactSection />
    </div>
  );
}