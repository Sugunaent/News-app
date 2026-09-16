/**
 * Central mock data store.
 * Replace these arrays with real API calls when connecting your backend.
 */

import type {
  Category, Promotion, Article, ArticleWithBlocks, Comment,
  Level, Badge, UserBadge, CompletionCard, TeamMember,
  ReadingHistoryItem, SavedArticleItem,
  OpinionWithArticle, AchievementItem, UserProfile,
} from '@/types';

/* ===================== CATEGORIES ===================== */

export const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Technology', slug: 'technology', description: 'The latest in tech and innovation', image_url: null },
  { id: 'cat-2', name: 'Science', slug: 'science', description: 'Discoveries and breakthroughs', image_url: null },
  { id: 'cat-3', name: 'Culture', slug: 'culture', description: 'Arts, society and human experience', image_url: null },
  { id: 'cat-4', name: 'Business', slug: 'business', description: 'Strategy, leadership and entrepreneurship', image_url: null },
  { id: 'cat-5', name: 'Health', slug: 'health', description: 'Wellness, medicine and longevity', image_url: null },
];

/* ===================== PROMOTIONS ===================== */

export const PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    title: 'The Future of AI in Creative Industries',
    description: 'Join our exclusive summit bringing together the world\'s leading minds in artificial intelligence and creative technology.',
    image_url: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
    external_url: '#',
    date_time: '2026-10-15T09:00:00Z',
    active: true,
  },
  {
    id: 'promo-2',
    title: 'Modern Stories Annual Conference 2026',
    description: 'Three days of immersive talks, workshops, and networking with visionary thinkers from around the globe.',
    image_url: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1200',
    external_url: '#',
    date_time: '2026-11-20T08:00:00Z',
    active: true,
  },
  {
    id: 'promo-3',
    title: 'Premium Membership — Unlock Everything',
    description: 'Get unlimited access to all articles, exclusive podcasts, interactive quizzes, and our growing archive.',
    image_url: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200',
    external_url: '#',
    date_time: null,
    active: true,
  },
];

/* ===================== ARTICLES ===================== */

const ARTICLE_IMAGES = [
  'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3913025/pexels-photo-3913025.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2977547/pexels-photo-2977547.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
];

export const ARTICLES: Article[] = [
  { id: 'art-1', title: 'How Large Language Models Are Reshaping Knowledge Work', subtitle: 'A deep dive into what the AI revolution actually means for the modern professional', category_id: 'cat-1', category: CATEGORIES[0], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[0], author_id: 'u1', author_name: 'Alex Chen', published_at: '2026-09-10T10:00:00Z', is_published: true, is_featured: true, is_authors_pick: true, reading_time_minutes: 8 },
  { id: 'art-2', title: 'The Quantum Computing Breakthrough Nobody Is Talking About', subtitle: 'IBM\'s latest chip changes the calculus on when quantum supremacy arrives', category_id: 'cat-2', category: CATEGORIES[1], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[1], author_id: 'u2', author_name: 'Priya Nair', published_at: '2026-09-09T08:00:00Z', is_published: true, is_featured: true, is_authors_pick: false, reading_time_minutes: 6 },
  { id: 'art-3', title: 'Renaissance of Craft: Why the Handmade is Making a Comeback', subtitle: 'In a world of algorithmic outputs, human imperfection is suddenly premium', category_id: 'cat-3', category: CATEGORIES[2], article_type: 'OPINION', cover_image_url: ARTICLE_IMAGES[2], author_id: 'u3', author_name: 'Mia Torres', published_at: '2026-09-08T12:00:00Z', is_published: true, is_featured: false, is_authors_pick: true, reading_time_minutes: 5 },
  { id: 'art-4', title: 'The Product-Led Growth Playbook for 2026', subtitle: 'How the most successful SaaS companies now build products that sell themselves', category_id: 'cat-4', category: CATEGORIES[3], article_type: 'FEATURED', cover_image_url: ARTICLE_IMAGES[3], author_id: 'u1', author_name: 'Alex Chen', published_at: '2026-09-07T09:00:00Z', is_published: true, is_featured: true, is_authors_pick: true, reading_time_minutes: 10 },
  { id: 'art-5', title: 'Intermittent Fasting: Separating Signal from Noise', subtitle: 'What five years of clinical research actually tells us about time-restricted eating', category_id: 'cat-5', category: CATEGORIES[4], article_type: 'QUIZ', cover_image_url: ARTICLE_IMAGES[4], author_id: 'u4', author_name: 'Dr. Lena Vogel', published_at: '2026-09-06T14:00:00Z', is_published: true, is_featured: false, is_authors_pick: true, reading_time_minutes: 7 },
  { id: 'art-6', title: 'Inside the Architecture of Modern AI Data Centers', subtitle: 'The invisible infrastructure powering every chatbot you\'ve ever used', category_id: 'cat-1', category: CATEGORIES[0], article_type: 'PODCAST', cover_image_url: ARTICLE_IMAGES[5], author_id: 'u2', author_name: 'Priya Nair', published_at: '2026-09-05T10:00:00Z', is_published: true, is_featured: false, is_authors_pick: false, reading_time_minutes: 12 },
  { id: 'art-7', title: 'Gene Editing\'s Quiet Revolution', subtitle: 'CRISPR applications in 2026 — from inherited disease to agricultural resilience', category_id: 'cat-2', category: CATEGORIES[1], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[6], author_id: 'u4', author_name: 'Dr. Lena Vogel', published_at: '2026-09-04T11:00:00Z', is_published: true, is_featured: false, is_authors_pick: true, reading_time_minutes: 9 },
  { id: 'art-8', title: 'The Urban Loneliness Epidemic and What Cities Are Doing About It', subtitle: 'Architecture, policy, and community design in service of human connection', category_id: 'cat-3', category: CATEGORIES[2], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[7], author_id: 'u3', author_name: 'Mia Torres', published_at: '2026-09-03T09:00:00Z', is_published: true, is_featured: true, is_authors_pick: false, reading_time_minutes: 11 },
  { id: 'art-9', title: 'Bootstrapped to $10M ARR: The Anti-VC Playbook', subtitle: 'Founders who said no to venture capital and built profitable businesses on their own terms', category_id: 'cat-4', category: CATEGORIES[3], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[8], author_id: 'u1', author_name: 'Alex Chen', published_at: '2026-09-02T08:00:00Z', is_published: true, is_featured: false, is_authors_pick: true, reading_time_minutes: 8 },
  { id: 'art-10', title: 'The Sleep Science Breakthroughs That Will Change How You Rest', subtitle: 'New research on circadian rhythm, sleep stages, and the optimal environment for deep sleep', category_id: 'cat-5', category: CATEGORIES[4], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[9], author_id: 'u4', author_name: 'Dr. Lena Vogel', published_at: '2026-09-01T10:00:00Z', is_published: true, is_featured: false, is_authors_pick: false, reading_time_minutes: 6 },
  { id: 'art-11', title: 'Neural Interfaces: The New Human-Computer Relationship', subtitle: 'Neuralink and its competitors are closer than you think to consumer products', category_id: 'cat-1', category: CATEGORIES[0], article_type: 'ARTICLE', cover_image_url: ARTICLE_IMAGES[10], author_id: 'u2', author_name: 'Priya Nair', published_at: '2026-08-31T08:00:00Z', is_published: true, is_featured: false, is_authors_pick: false, reading_time_minutes: 7 },
  { id: 'art-12', title: 'The New Rules of Remote Leadership', subtitle: 'What three years of fully distributed teams have taught us about managing across time zones', category_id: 'cat-4', category: CATEGORIES[3], article_type: 'OPINION', cover_image_url: ARTICLE_IMAGES[11], author_id: 'u3', author_name: 'Mia Torres', published_at: '2026-08-30T12:00:00Z', is_published: true, is_featured: false, is_authors_pick: true, reading_time_minutes: 5 },
  { id: 'art-13', title: 'This is what happens when you dont eat', subtitle: 'The biochemical cascade of prolonged fasting: from glycogen depletion to autophagy and cellular repair', category_id: 'cat-5', category: CATEGORIES[4], article_type: 'OPINION', cover_image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', author_id: 'u4', author_name: 'Dr. Lena Vogel', published_at: '2026-09-12T09:00:00Z', is_published: true, is_featured: true, is_authors_pick: true, reading_time_minutes: 6 },
];

/* ===================== ARTICLES WITH BLOCKS ===================== */

export const ARTICLES_WITH_BLOCKS: Record<string, ArticleWithBlocks> = {
  'art-13': {
    id: 'art-13',
    title: 'This is what happens when you dont eat',
    subtitle: 'The biochemical cascade of prolonged fasting: from glycogen depletion to autophagy and cellular repair',
    category_id: 'cat-5',
    category: CATEGORIES[4],
    article_type: 'OPINION',
    cover_image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    author_id: 'u4',
    author_name: 'Dr. Lena Vogel',
    published_at: '2026-09-12T09:00:00Z',
    is_published: true,
    is_featured: true,
    is_authors_pick: true,
    reading_time_minutes: 6,
    blocks: [
      {
        id: 'fasting-b1',
        article_id: 'art-13',
        block_type: 'TEXT',
        order_index: 0,
        content: 'When you stop eating, your body does not simply power down into starvation mode — it initiates a finely tuned metabolic choreography honed over millions of years of evolutionary survival.\n\nWithin hours, circulating insulin levels plummet, signaling your cells to switch metabolic gears from glucose oxidation to fat mobilization. This transition triggers profound biochemical changes across your liver, adipose tissue, brain, and immune system.',
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: 'fasting-b2',
        article_id: 'art-13',
        block_type: 'IMAGE',
        order_index: 1,
        content: null,
        image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=900',
        image_caption: 'Metabolic switching: transitioning from carbohydrate oxidation to fatty acid lipolysis and ketogenesis.',
        quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: 'fasting-b3',
        article_id: 'art-13',
        block_type: 'TEXT',
        order_index: 2,
        content: 'The 4 Distinct Physiological Stages of Caloric Deprivation:\n\n1. Hours 0–8 (Post-Absorptive Phase): Circulating glucose and glycogen provide steady fuel while insulin gradually recedes.\n\n2. Hours 12–24 (Glycogen Depletion & Lipolysis): Liver glycogen stores deplete, prompting the breakdown of fatty acids into acetoacetate and beta-hydroxybutyrate.\n\n3. Hours 24–48 (Autophagy & Cellular Cleansing): Cells initiate autophagy, dismantling misfolded protein aggregates, dysfunctional mitochondria, and senescent waste.\n\n4. Hours 48–72+ (Deep Ketosis & Brain Adaptation): Ketone bodies cross the blood-brain barrier to supply up to 70% of cerebral energy, preserving muscle mass and sharpening cognitive alertness.',
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: 'fasting-b4',
        article_id: 'art-13',
        block_type: 'QUIZ',
        order_index: 3,
        content: null,
        image_url: null,
        image_caption: null,
        quiz_id: 'quiz-fasting-1',
        quiz: {
          id: 'quiz-fasting-1',
          article_id: 'art-13',
          title: 'Metabolic Science Knowledge Check',
          question: 'What primary metabolic shift occurs when liver glycogen is depleted around 16–24 hours into fasting?',
          xp_reward: 20,
          options: [
            { id: 'qf-1', label: 'The body immediately begins breaking down vital organ proteins', is_correct: false, explanation: 'Incorrect. The body spares protein and preferentially burns stored lipids and ketones.' },
            { id: 'qf-2', label: 'The liver increases beta-oxidation to produce ketone bodies from fats', is_correct: true, explanation: 'Correct! Hepatic ketogenesis ramps up to supply ketones (like BHB) to the brain and heart.' },
            { id: 'qf-3', label: 'Insulin levels skyrocket to lock in remaining blood glucose', is_correct: false, explanation: 'Incorrect. Insulin levels drop significantly during fasting periods.' },
            { id: 'qf-4', label: 'Cellular autophagy shuts down completely to conserve energy', is_correct: false, explanation: 'Incorrect. Autophagy is actually upregulated and activated during nutrient deprivation.' },
          ],
        },
        opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: 'fasting-b5',
        article_id: 'art-13',
        block_type: 'TEXT',
        order_index: 4,
        content: 'While the cellular rejuvenation mechanisms like autophagy and insulin sensitization are compelling, clinical fasting requires individualized caution. Factors including electrolyte balance (sodium, magnesium, potassium), baseline thyroid function, cortisol curves, and personal health history determine whether fasting promotes vitality or systemic stress.\n\nResearchers emphasize that fasting should be viewed as an intermittent biological stimulus rather than an ongoing deprivation lifestyle.',
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: 'fasting-b6',
        article_id: 'art-13',
        block_type: 'OPINION',
        order_index: 5,
        content: null,
        image_url: null,
        image_caption: null,
        quiz_id: null,
        quiz: null,
        opinion_id: 'op-fasting-1',
        opinion: {
          id: 'op-fasting-1',
          article_id: 'art-13',
          question: 'What is your opinion on intermittent and prolonged fasting protocols for human health and longevity?',
          options: [
            'A powerful evolutionary tool for metabolic health and cellular renewal',
            'Effective for caloric control, but claims about longevity are overhyped',
            'Potentially risky and unsustainable for most everyday lifestyles',
            'Prefer regular balanced whole-food meals without rigid fasting windows',
          ],
          xp_reward: 50,
          allow_custom_text: true,
        },
        podcast_id: null, podcast: null,
      },
      {
        id: 'fasting-b7',
        article_id: 'art-13',
        block_type: 'TEXT',
        order_index: 6,
        content: 'As nutritional biochemistry continues to unravel the nuances of fasting-mimicking diets and time-restricted feeding, one truth stands clear: human metabolism was built for nutritional flexibility, oscillating between feast and famine with evolutionary resilience.',
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
    ],
  },
  'art-1': {
    ...ARTICLES[0],
    blocks: [
      { id: 'b1', article_id: 'art-1', block_type: 'TEXT', order_index: 0, content: 'The arrival of large language models in the mainstream has triggered one of the most significant restructurings of knowledge work in a generation. Professionals who once spent hours researching, drafting, and synthesizing information now delegate those tasks to AI — and the results are transforming industries from law to medicine to software engineering.\n\nBut the transition is far from smooth. As models grow more capable, the questions they raise become more profound: What does expertise mean when AI can replicate its output? How do we evaluate the work of someone who uses AI extensively? And what cognitive skills should humans double down on in a world where machines handle first drafts?', image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
      { id: 'b2', article_id: 'art-1', block_type: 'IMAGE', order_index: 1, content: null, image_url: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=900', image_caption: 'Modern AI systems process billions of parameters to generate human-like text.', quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
      { id: 'b3', article_id: 'art-1', block_type: 'TEXT', order_index: 2, content: 'The productivity gains are real and measurable. Studies from Stanford and MIT have documented 20-40% efficiency improvements across writing-intensive roles. Legal associates who use AI for contract review complete tasks in a fraction of the time. Software engineers ship features faster. Analysts produce more comprehensive reports.\n\nYet efficiency is only part of the story. The more interesting question is what happens to the quality and character of intellectual work when AI assists at every step. Critics argue we risk creating a generation of professionals who can prompt their way through problems but cannot think from first principles. Proponents counter that AI frees humans for higher-order reasoning by eliminating drudgework.\n\nBoth are probably right.', image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
      { id: 'b4', article_id: 'art-1', block_type: 'QUIZ', order_index: 3, content: null, image_url: null, image_caption: null, quiz_id: 'quiz-1', quiz: { id: 'quiz-1', article_id: 'art-1', title: 'Knowledge Check', question: 'According to research cited in this article, what efficiency improvement do AI-assisted writing roles typically see?', xp_reward: 15, options: [ { id: 'q1o1', label: '5-10%', is_correct: false, explanation: 'The improvement documented is significantly higher than this.' }, { id: 'q1o2', label: '20-40%', is_correct: true, explanation: 'Correct! Stanford and MIT studies documented 20-40% efficiency improvements.' }, { id: 'q1o3', label: '60-80%', is_correct: false, explanation: 'While impressive, the actual figure cited is 20-40%.' }, { id: 'q1o4', label: '100%+', is_correct: false, explanation: 'This would imply doubling productivity — the actual figure is more modest.' } ] }, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
      { id: 'b5', article_id: 'art-1', block_type: 'TEXT', order_index: 4, content: 'The firms navigating this transition best share a common trait: they treat AI as augmentation, not replacement. Rather than asking "which jobs can AI do?" they ask "how can AI make our people dramatically better?" This reframe changes everything — hiring criteria, training programmes, performance evaluation, and the nature of the work itself.\n\nIn law, the leading firms are training associates to be "AI supervisors" — professionals who can direct models, evaluate their outputs critically, and catch the subtle errors that AI makes with alarming confidence. In medicine, radiologists who once feared AI are now its most enthusiastic adopters, using models to flag anomalies and catch what tired eyes miss.\n\nThe pattern is consistent across domains: the professionals who thrive are those who develop deep AI literacy while doubling down on the human skills machines cannot replicate — empathy, ethical judgment, creative synthesis, and the ability to navigate ambiguity.', image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
      { id: 'b6', article_id: 'art-1', block_type: 'OPINION', order_index: 5, content: null, image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: 'op-1', opinion: { id: 'op-1', article_id: 'art-1', question: 'How concerned are you about AI replacing knowledge workers in your field?', options: ['Very concerned — I think major disruption is coming', 'Somewhat concerned — it will affect some roles', 'Not very concerned — AI will create more than it replaces', 'Excited — I welcome the change'], xp_reward: 50 }, podcast_id: null, podcast: null },
      { id: 'b7', article_id: 'art-1', block_type: 'TEXT', order_index: 6, content: 'The question that hangs over all of this is one of timescale. The disruptions of the industrial revolution took decades to unfold and were absorbed across generations. The AI transformation is happening in years, not decades. Organisations that move slowly risk being leapfrogged by more agile competitors. Individuals who do not develop AI fluency will find their market value eroding faster than any previous technological shift has produced.\n\nThe good news is that human adaptability — our genuine competitive advantage over machines — is equal to the challenge. The professionals who recognise the moment they are in, who invest in understanding these tools deeply rather than avoiding them, who combine AI capability with irreducibly human judgment, will not just survive this transition. They will define what knowledge work looks like for the next generation.', image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
    ],
  },
  'art-6': {
    ...ARTICLES[5],
    blocks: [
      { id: 'pb1', article_id: 'art-6', block_type: 'TEXT', order_index: 0, content: 'Data centers are the invisible backbone of the modern internet. But with AI workloads demanding unprecedented compute, a new generation of facilities is being built — and they look nothing like what came before.', image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
      { id: 'pb2', article_id: 'art-6', block_type: 'PODCAST', order_index: 1, content: null, image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: 'pod-1', podcast: { id: 'pod-1', article_id: 'art-6', title: 'Inside the AI Data Center Revolution', audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration_seconds: 1847, description: 'A 30-minute deep dive into how hyperscalers are redesigning compute infrastructure for the AI era.' } },
      { id: 'pb3', article_id: 'art-6', block_type: 'TEXT', order_index: 2, content: 'Traditional data centers optimised for latency and storage. AI data centers optimise for throughput — the raw ability to move data through GPU clusters at maximum speed. The cooling requirements alone have forced a rethinking of facility design from the ground up, with liquid cooling becoming standard and nuclear power partnerships now on the table for the largest hyperscalers.\n\nThe implications extend far beyond technology. Communities near proposed AI campuses are grappling with water usage, energy demand, and the economic effects of facilities that employ relatively few people despite their enormous capital footprints.', image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null },
    ],
  },
};

// For articles not in ARTICLES_WITH_BLOCKS, generate a standard one
export function generateArticleWithBlocks(article: Article): ArticleWithBlocks {
  return {
    ...article,
    blocks: [
      {
        id: `${article.id}-b1`,
        article_id: article.id,
        block_type: 'TEXT',
        order_index: 0,
        content: `${article.subtitle}\n\nThis is an in-depth exploration of one of the most significant topics in ${article.category?.name ?? 'modern thought'}. The research and analysis presented here draws on the latest findings from leading institutions and practitioners in the field.\n\nOver the next few sections, we will examine the key drivers of change, the implications for professionals and organisations, and the practical steps that forward-thinking individuals can take to position themselves for success in a rapidly evolving landscape.`,
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: `${article.id}-b2`,
        article_id: article.id,
        block_type: 'IMAGE',
        order_index: 1,
        content: null,
        image_url: article.cover_image_url,
        image_caption: `Exploring the themes of ${article.title}.`,
        quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: `${article.id}-b3`,
        article_id: article.id,
        block_type: 'TEXT',
        order_index: 2,
        content: `The first dimension worth examining is the historical context. Understanding how we arrived at this moment requires looking back at the decisions, discoveries, and disruptions of the past decade — each of which has contributed to the current state of affairs in ways that are often underappreciated.\n\nWhat emerges from this historical analysis is a picture of accelerating change punctuated by key inflection points. The professionals who saw those inflection points coming — and positioned themselves accordingly — consistently outperformed those who waited for certainty before acting.`,
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: `${article.id}-b4`,
        article_id: article.id,
        block_type: 'TEXT',
        order_index: 3,
        content: `The second dimension is the competitive landscape. New entrants are disrupting established players with remarkable speed. The barriers that once protected incumbents — capital, relationships, institutional knowledge — are eroding as technology democratises access to tools and markets that were previously out of reach for smaller players.\n\nThis creates both threat and opportunity. Organisations that recognise the shift and adapt their operating models accordingly will find themselves well positioned. Those that cling to legacy approaches risk being overtaken by more agile competitors operating with a fraction of their resources.`,
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: `${article.id}-b5`,
        article_id: article.id,
        block_type: 'QUIZ',
        order_index: 4,
        content: null,
        image_url: null, image_caption: null,
        quiz_id: `${article.id}-quiz`,
        quiz: {
          id: `${article.id}-quiz`,
          article_id: article.id,
          title: 'Knowledge Check',
          question: `Which of the following best describes the core argument of "${article.title}"?`,
          xp_reward: 15,
          options: [
            { id: `${article.id}-q1`, label: 'Technology always disrupts established industries', is_correct: false, explanation: 'This is too broad a statement not specific to the article.' },
            { id: `${article.id}-q2`, label: 'Understanding historical context helps anticipate inflection points', is_correct: true, explanation: 'Correct! The article emphasises that historical analysis reveals patterns of accelerating change.' },
            { id: `${article.id}-q3`, label: 'Incumbents always win in the long run', is_correct: false, explanation: 'The article actually argues the opposite — incumbents face growing threats.' },
            { id: `${article.id}-q4`, label: 'Change is slowing down in the modern era', is_correct: false, explanation: 'The article specifically describes accelerating change.' },
          ],
        },
        opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
      {
        id: `${article.id}-b6`,
        article_id: article.id,
        block_type: 'TEXT',
        order_index: 5,
        content: `The path forward requires a combination of intellectual honesty and strategic boldness. Intellectual honesty means acknowledging the gaps in your current capabilities — the skills, relationships, and resources you do not yet have but will need. Strategic boldness means committing to close those gaps before competitors do, even when the investment feels premature.\n\nThe organisations and individuals who master this balance will define their respective fields over the coming decade. Those who wait for the perfect moment to act will find themselves perpetually reactive, always catching up to others who moved with greater conviction.\n\nThe opportunity exists right now. The question is simply who will be decisive enough to seize it.`,
        image_url: null, image_caption: null, quiz_id: null, quiz: null, opinion_id: null, opinion: null, podcast_id: null, podcast: null,
      },
    ],
  };
}

/* ===================== COMMENTS ===================== */

export const COMMENTS: Comment[] = [
  { id: 'c1', article_id: 'art-1', user_id: 'u2', display_name: 'Priya Nair', avatar_url: null, content: 'Excellent breakdown. The point about AI supervisors is particularly relevant — I\'ve been seeing exactly this pattern at my firm.', created_at: '2026-09-10T14:30:00Z' },
  { id: 'c2', article_id: 'art-1', user_id: 'u3', display_name: 'Mia Torres', avatar_url: null, content: 'The comparison to the industrial revolution is apt. The difference in timescale is what most people aren\'t accounting for.', created_at: '2026-09-10T16:00:00Z' },
  { id: 'c3', article_id: 'art-1', user_id: 'u4', display_name: 'Dr. Lena Vogel', avatar_url: null, content: 'From a healthcare perspective: the radiologist example is spot on. AI catches things we miss. We\'re better together.', created_at: '2026-09-10T18:00:00Z' },
];

/* ===================== LEVELS ===================== */

export const LEVELS: Level[] = [
  { id: 'lv-1', level_number: 1, name: 'Curious Reader', xp_threshold: 0, image_url: null },
  { id: 'lv-2', level_number: 2, name: 'Avid Learner', xp_threshold: 100, image_url: null },
  { id: 'lv-3', level_number: 3, name: 'Deep Thinker', xp_threshold: 300, image_url: null },
  { id: 'lv-4', level_number: 4, name: 'Knowledge Seeker', xp_threshold: 700, image_url: null },
  { id: 'lv-5', level_number: 5, name: 'Story Master', xp_threshold: 1500, image_url: null },
  { id: 'lv-6', level_number: 6, name: 'Luminary', xp_threshold: 3000, image_url: null },
];

/* ===================== BADGES ===================== */

export const BADGES: Badge[] = [
  { id: 'badge-1', name: 'First Read', description: 'Complete your first article', image_url: null },
  { id: 'badge-2', name: 'Quiz Ace', description: 'Answer 5 quiz questions correctly', image_url: null },
  { id: 'badge-3', name: 'Opinion Leader', description: 'Submit 3 opinions', image_url: null },
  { id: 'badge-4', name: 'Bookworm', description: 'Complete 10 articles', image_url: null },
  { id: 'badge-5', name: 'Deep Diver', description: 'Read an article over 10 minutes long', image_url: null },
  { id: 'badge-6', name: 'Streak Keeper', description: 'Read 5 days in a row', image_url: null },
];

/* ===================== TEAM MEMBERS ===================== */

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'tm-1', name: 'Tolety Mohana Shyam', role: 'Founder', bio: 'At The Modern Stories, we look past the obvious to bring you the conversations that truly matter. Step beyond the bias, think critically, and see the world from a different lens.', image_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', social_links: [{ label: 'Twitter', url: '#' }] },
  { id: 'tm-2', name: 'Chinta Suguna Vanditha', role: 'Content Writer', bio: 'The Modern Stories explores the overlooked narratives of our world with honesty and nuance. Rather than telling you what to think, it invites you to look closer and see every story differently.', image_url: 'https://images.pexels.com/photos/3796217/pexels-photo-3796217.jpeg?auto=compress&cs=tinysrgb&w=400', social_links: [{ label: 'LinkedIn', url: '#' }] },
  { id: 'tm-3', name: 'Sree Keerthana Gorty', role: 'Sr. Business Analyst', bio: 'A go to platform for modern ideas in modern platform having modern people!', image_url: 'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=400', social_links: [{ label: 'Twitter', url: '#' }] },
  { id: 'tm-4', name: 'Indira Pagadala', role: 'AI-ML Engineer', bio: 'Built with thoughtful journalism in mind, The Modern Stories is the perfect way to stay updated in today\'s world', image_url: 'https://images.pexels.com/photos/5386785/pexels-photo-5386785.jpeg?auto=compress&cs=tinysrgb&w=400', social_links: [{ label: 'LinkedIn', url: '#' }] },
];

/* ===================== MOCK USER DATA (per session) ===================== */

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default-id',
  email: 'reader@modernstories.com',
  display_name: 'TMS Reader',
  avatar_url: null,
  xp: 145,
  level: 2,
  bio: null,
};

export const DEFAULT_USER_BADGES: UserBadge[] = [
  { id: 'ub-1', user_id: 'mock-user-id', badge_id: 'badge-1', badge: BADGES[0], earned_at: '2026-09-05T10:00:00Z' },
  { id: 'ub-2', user_id: 'mock-user-id', badge_id: 'badge-2', badge: BADGES[1], earned_at: '2026-09-07T14:00:00Z' },
];

export const DEFAULT_COMPLETION_CARDS: CompletionCard[] = [
  { id: 'cc-1', user_id: 'mock-user-id', article_id: 'art-2', article_title: ARTICLES[1].title, xp_gained: 45, created_at: '2026-09-09T09:00:00Z', card_type: 'completion' },
  { id: 'cc-2', user_id: 'mock-user-id', article_id: 'art-1', article_title: ARTICLES[0].title, xp_gained: 50, created_at: '2026-09-10T15:00:00Z', card_type: 'opinion', opinion_text: 'Somewhat concerned — it will affect some roles' },
  { id: 'cc-3', user_id: 'mock-user-id', article_id: 'art-3', article_title: ARTICLES[2].title, xp_gained: 30, created_at: '2026-09-08T13:00:00Z', card_type: 'completion' },
];

export const DEFAULT_READING_HISTORY: ReadingHistoryItem[] = [
  { article_id: 'art-4', user_id: 'mock-user-id', percentage: 65, scroll_position: 1200, completed: false, updated_at: '2026-09-11T08:00:00Z', article: ARTICLES[3] },
];

export const DEFAULT_SAVED_ARTICLES: SavedArticleItem[] = [
  { id: 'bm-1', user_id: 'mock-user-id', article_id: 'art-7', created_at: '2026-09-10T10:00:00Z', article: ARTICLES[6] },
  { id: 'bm-2', user_id: 'mock-user-id', article_id: 'art-8', created_at: '2026-09-09T16:00:00Z', article: ARTICLES[7] },
];

export const DEFAULT_OPINIONS: OpinionWithArticle[] = [
  {
    id: 'ops-1',
    opinion_id: 'op-1',
    user_id: 'mock-user-id',
    selected_option: 'Somewhat concerned — it will affect some roles',
    created_at: '2026-09-10T15:00:00Z',
    opinion: { id: 'op-1', article_id: 'art-1', question: 'How concerned are you about AI replacing knowledge workers in your field?', options: ['Very concerned', 'Somewhat concerned', 'Not very concerned', 'Excited'], xp_reward: 50 },
    article: ARTICLES[0],
  },
];

export const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  { id: 'ach-1', type: 'completion', title: 'Article Completed', description: ARTICLES[1].title, date: '2026-09-09T09:00:00Z', xp: 45, article_title: ARTICLES[1].title },
  { id: 'ach-2', type: 'badge', title: 'Quiz Ace', description: 'Answer 5 quiz questions correctly', date: '2026-09-07T14:00:00Z', xp: 0, badge_image: null },
  { id: 'ach-3', type: 'completion', title: 'Article Completed', description: ARTICLES[2].title, date: '2026-09-08T13:00:00Z', xp: 30, article_title: ARTICLES[2].title },
  { id: 'ach-4', type: 'badge', title: 'First Read', description: 'Complete your first article', date: '2026-09-05T10:00:00Z', xp: 0, badge_image: null },
  { id: 'ach-5', type: 'quiz', title: 'Quiz Correct Answer', description: 'Earned 15 XP', date: '2026-09-10T11:00:00Z', xp: 15 },
];
