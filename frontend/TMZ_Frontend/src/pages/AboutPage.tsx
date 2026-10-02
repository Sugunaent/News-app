import { useEffect } from 'react';
import { ContactSection } from '@/components/common/ContactSection';
import { GlowingEffect } from '@/components/articles/GlowingEffect';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { removeJsonLd, upsertJsonLd } from '@/lib/seo';

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

export function AboutPage() {
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
    <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-24">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
      {/* About The Modern Stories */}
      <section className="w-full space-y-16">
        {/* Main Heading & Lead */}
        <div className="text-center w-full max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-6">About The Modern Stories</h1>
          <p className="font-display text-2xl md:text-3xl text-brand-primary mb-6 leading-snug">
            “We are drowning in information, but starving for truth.”
          </p>
          <div className="space-y-4 text-secondary text-base md:text-lg leading-relaxed text-left md:text-center">
            <p>
              Let’s be completely honest for a second. Every single day, we’re handed dry, robotic &ldquo;news&rdquo; that tells us what to think instead of helping us understand why it matters. Headlines are weaponized for clicks. Algorithms feed us echo chambers. Education is often treated like memorizing someone else&apos;s script, and the media prefers taking sides over telling the truth.
            </p>
            <p className="font-medium text-primary text-lg md:text-xl">
              We got tired of it. That’s why we built The Modern Stories.
            </p>
          </div>
        </div>

        {/* Our Motto Banner */}
        <div className="glass-card p-8 md:p-10 text-center w-full max-w-3xl mx-auto border-brand-primary/30">
          <span className="text-xs uppercase tracking-widest text-brand-primary font-semibold block mb-2">Our Motto</span>
          <h2 className="font-display text-3xl md:text-4xl text-primary mb-3">
            &ldquo;Break through the Bias.&rdquo;
          </h2>
          <p className="text-sm md:text-base text-muted italic">
            (Because the truth shouldn’t come with an agenda.)
          </p>
        </div>

        {/* Where We Stand & What Drives Us Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Where We Stand */}
          <div className="glass-card p-8 md:p-10 space-y-6">
            <h2 className="font-display text-2xl text-primary flex items-center gap-3">
              <span className="w-2 h-6 bg-brand-primary rounded-full inline-block"></span>
              Where We Stand
            </h2>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">Opinions over robotic news</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">
                  Dry stats don’t build understanding; real, lived experiences do. When people share perspectives openly, echo chambers break and the actual truth emerges.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">Freedom to think, not just consume</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">
                  True learning isn&apos;t memorizing someone else&apos;s script—it’s the freedom to question narratives and find your own voice.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">Respecting your intelligence</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">
                  No manufactured outrage, no hidden PR agendas, and no sugarcoating. Just honest, grounded realities.
                </p>
              </div>
            </div>
          </div>

          {/* What Drives Us */}
          <div className="glass-card p-8 md:p-10 space-y-6">
            <h2 className="font-display text-2xl text-primary flex items-center gap-3">
              <span className="w-2 h-6 bg-brand-accent rounded-full inline-block"></span>
              What Drives Us
            </h2>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">Radical Honesty</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">
                  Nuance matters more than viral hype.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">Human First</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">
                  Real struggles and authentic growth over algorithmic trends.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-primary">Open Disagreement</h3>
                <p className="text-sm md:text-base text-secondary leading-relaxed">
                  We believe healthy minds don&apos;t always agree, but they talk like adults.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* You Don't Belong in an Echo Chamber */}
        <div className="glass-card p-8 md:p-12 text-center w-full">
          <h2 className="font-display text-2xl md:text-3xl text-primary mb-4">
            You Don’t Belong in an Echo Chamber.
          </h2>
          <p className="text-secondary text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
            Whether you&apos;re here to unlearn, share an unconventional thought, or read without being manipulated:
          </p>
          <p className="font-display text-xl md:text-2xl text-brand-primary mb-4">
            Welcome to The Modern Stories.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 text-sm md:text-base font-medium text-primary">
            <span className="px-4 py-1.5 rounded-full bg-surface-secondary border border-border">Think freely</span>
            <span className="text-muted">•</span>
            <span className="px-4 py-1.5 rounded-full bg-surface-secondary border border-border">Speak honestly</span>
            <span className="text-muted">•</span>
            <span className="px-4 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/30">Break through the bias</span>
          </div>
        </div>
      </section>

      {/* About the Company */}
      <section className="w-full">
        <div className="glass-card p-8 md:p-12 w-full">
          <h2 className="font-display text-3xl text-primary mb-6">Our Company</h2>
          <div className="space-y-5 text-secondary text-base md:text-lg leading-relaxed">
            <p>
              We believe reading should be an experience, not a chore. Our team of editors, engineers,
              and designers have built a platform that transforms articles into interactive journeys —
              with quizzes, opinions, podcasts, and progressive reading unlocks that reward curiosity.
            </p>
            <p>
              Every article on The Modern Stories is crafted to inform, challenge, and inspire. We combine
              editorial rigor with modern technology to create a reading experience that feels alive.
            </p>
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      <section>
        <h2 className="font-display text-3xl text-primary text-center mb-10">Meet the Team</h2>
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
                <p className="text-sm text-brand-primary mb-2 font-medium">{member.role}</p>
                <p className="text-xs text-muted leading-relaxed flex-1">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-faq-heading" className="w-full max-w-4xl mx-auto">
        <h2 id="about-faq-heading" className="font-display text-3xl text-primary mb-6">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <details key={question} className="glass-card p-5">
              <summary className="cursor-pointer font-semibold text-primary">{question}</summary>
              <p className="mt-3 leading-relaxed text-secondary">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <ContactSection />
    </div>
  );
}