import type { Metadata } from 'next';
import { ReviewSession } from '@/components/review/ReviewSession';
import { getWordList } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Smart review' };

export default function SmartReviewPage() {
  return <ReviewSession mode="smart" curriculum={getWordList()} />;
}
