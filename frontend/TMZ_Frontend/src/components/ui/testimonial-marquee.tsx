export interface Testimonial {
  quote: string;
  name: string;
  handle: string;
}

export const testimonials: Testimonial[] = [
  // English readers
  {
    quote: 'Honestly, reading this blog with my morning coffee has become a daily ritual. Super grounded and insightful content.',
    name: 'Alex Rivera',
    handle: '@alex_design',
  },
  {
    quote: 'Usually, technical/blog posts get dry really fast, but the writing here is crisp and straight to the point.',
    name: 'Ananya Sharma',
    handle: '@ananya_dev',
  },
  {
    quote: 'Dropped by for a quick read and ended up bookmarking 3 articles. Beautiful typography and dark mode layout!',
    name: 'Elena Rossi',
    handle: '@elenar',
  },
  {
    quote: 'The layout and reading experience are top-notch. Clean aesthetic without any distracting fluff.',
    name: 'Tom Alvarez',
    handle: '@toma',
  },
  {
    quote: 'Checked out a recommended tool from the promotions section. Truly value-driven curation!',
    name: 'David Chen',
    handle: '@dchen_tech',
  },
  {
    quote: 'Simple, precise, and well-researched. Exactly what a busy professional needs during short breaks.',
    name: 'Sarah Jenkins',
    handle: '@sarah_j',
  },
  {
    quote: 'The visual presentation and smooth UI transitions make reading here super enjoyable.',
    name: 'Priya Nair',
    handle: '@priyadesigns',
  },
  // Telugu / Teluglish readers
  {
    quote: 'Daily morning news and updates kosam idi perfect destination. Content presentation chaala clean ga untundi.',
    name: 'Srinivas Rao',
    handle: '@srinivas_tech',
  },
  {
    quote: 'Articles explanation style super simple and clear. Heavy concepts ni kuda easy ga simplify chestaru.',
    name: 'Karthik Verma',
    handle: '@karthik_v',
  },
  {
    quote: 'Promotions section lo unna latest deals try chesa. Really useful and totally worth bookmarking!',
    name: 'Meghana Reddy',
    handle: '@meghana_ui',
  },
  {
    quote: 'Weekly once vastanu quality long-reads kosam. Highly recommended for daily tech & blog readers.',
    name: 'Vikram Teja',
    handle: '@vteja_notes',
  },
  {
    quote: 'Design flow, theme toggle and mobile view reading experience extremely comfortable ga undi.',
    name: 'Divya Gopal',
    handle: '@divya_g',
  },
  {
    quote: 'Zero fluff, direct point ki vastaru. Prati article lo oka solid takeaway untundi.',
    name: 'Madhav Krishna',
    handle: '@m_krishna',
  },
  // Hindi / Hinglish readers
  {
    quote: 'Bohot hi clean aur to-the-point articles hain. Subah ki chai ke saath padhne ka maza hi alag hai!',
    name: 'Rohan Kapoor',
    handle: '@rohan_k',
  },
  {
    quote: 'Content quality next level hai boss. Complexity ke bina mushkil topics bhi easily samajh aa jaate hain.',
    name: 'Aman Verma',
    handle: '@aman_v',
  },
  {
    quote: 'Promotions and recommendations genuinely helpful hain. No fake hype, pure value!',
    name: 'Sneha Gupta',
    handle: '@sneha_g',
  },
  {
    quote: 'Website ka dark mode and ui aesthetic bilkul smooth hai. Reading experience 10/10.',
    name: 'Kabir Mehta',
    handle: '@kabirmehta',
  },
  {
    quote: 'In-depth breakdowns without making it boring. Easily one of my favorite daily blogs now.',
    name: 'Pooja Malhotra',
    handle: '@pooja_m',
  },
  {
    quote: 'Sahi me kaafi informative content hai. Dost logon ke saath articles share karna padta hai daily!',
    name: 'Vikrant Singh',
    handle: '@vikrant_s',
  },
  {
    quote: 'Great balance of tech, design, and practical insights. Keep up the amazing work team!',
    name: 'Neha Joshi',
    handle: '@neha_j',
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full w-[min(82vw,360px)] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-900/70 sm:w-[360px] sm:p-6">
      <blockquote className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 sm:text-base">
        “{testimonial.quote}”
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 font-display text-sm text-brand-primary dark:bg-brand-accent/10 dark:text-brand-accent"
        >
          {testimonial.name
            .split(' ')
            .map((part) => part[0])
            .join('')}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-body text-sm font-semibold text-primary">{testimonial.name}</span>
          <span className="truncate text-xs text-muted">{testimonial.handle}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: Testimonial[];
  reverse?: boolean;
}) {
  return (
    <div className="testimonial-marquee-viewport">
      <div className={`testimonial-marquee-track${reverse ? ' testimonial-marquee-track-reverse' : ''}`}>
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 gap-4 pr-4"
            aria-hidden={copy === 1}
          >
            {items.map((testimonial) => (
              <TestimonialCard key={`${testimonial.handle}-${copy}`} testimonial={testimonial} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestimonialMarquee() {
  const firstRow = testimonials.slice(0, 10);
  const secondRow = testimonials.slice(10);

  return (
    <section aria-labelledby="reader-testimonials-heading" className="w-full overflow-hidden">
      <div className="mx-auto mb-8 max-w-7xl px-4 text-center sm:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary dark:text-brand-accent">
          Reader voices
        </p>
        <h2
          id="reader-testimonials-heading"
          className="font-display text-3xl text-primary sm:text-4xl md:text-5xl"
        >
          Stories from our readers
        </h2>
      </div>
      <div className="space-y-4">
        <MarqueeRow items={firstRow} />
        <MarqueeRow items={secondRow} reverse />
      </div>
    </section>
  );
}

export default TestimonialMarquee;
