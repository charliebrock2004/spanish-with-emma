import type { Metadata } from 'next';
import { ReviewSession } from '@/components/review/ReviewSession';
import { getWordList } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Fix my mistakes' };

export default function MistakesReviewPage() {
  return <ReviewSession mode="mistakes" curriculum={getWordList()} />;
}
