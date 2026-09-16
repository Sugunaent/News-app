import type { ArticleBlock } from '@/types';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { QuizBlock } from './blocks/QuizBlock';
import { OpinionBlock } from './blocks/OpinionBlock';
import { PodcastBlock } from './blocks/PodcastBlock';

interface ArticleBlockRendererProps {
  block: ArticleBlock;
  onQuizResult?: (xp: number) => void;
  onOpinionSubmit?: (opinionText: string, xpEarned: number) => void;
}

export function ArticleBlockRenderer({ block, onQuizResult, onOpinionSubmit }: ArticleBlockRendererProps) {
  switch (block.block_type) {
    case 'TEXT':
      return <TextBlock content={block.content} />;
    case 'IMAGE':
      return <ImageBlock imageUrl={block.image_url} caption={block.image_caption} />;
    case 'QUIZ':
      return block.quiz ? <QuizBlock quiz={block.quiz} onResult={onQuizResult} /> : null;
    case 'OPINION':
      return block.opinion ? <OpinionBlock opinion={block.opinion} onSubmit={onOpinionSubmit} /> : null;
    case 'PODCAST':
      return block.podcast ? <PodcastBlock podcast={block.podcast} /> : null;
    default:
      return null;
  }
}
