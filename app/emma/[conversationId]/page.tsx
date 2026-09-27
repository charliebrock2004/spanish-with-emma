import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChatScreen } from '@/components/conversation/ChatScreen';
import { SCENARIOS } from '@/data/conversations/scenarios';
import { SPECIAL_SCENES } from '@/data/conversations/specials';
import { CHAT_TOPICS } from '@/data/conversations/topics';

/** Every guided scene: the course's, plus the special scenes from the shop (owned ones open on the device). */
const ALL_SCENES = [...SCENARIOS, ...SPECIAL_SCENES];

export const dynamicParams = false;

/** Guided scenes use their id; AI topics are prefixed with "ai-". */
function resolve(conversationId: string) {
  const scenario = ALL_SCENES.find((s) => s.id === conversationId);
  const topic = conversationId.startsWith('ai-') ? CHAT_TOPICS.find((t) => `ai-${t.id}` === conversationId) : undefined;
  return { scenario, topic };
}

export function generateStaticParams() {
  return [...ALL_SCENES.map((s) => ({ conversationId: s.id })), ...CHAT_TOPICS.map((t) => ({ conversationId: `ai-${t.id}` }))];
}

export async function generateMetadata({ params }: { params: Promise<{ conversationId: string }> }): Promise<Metadata> {
  const { conversationId } = await params;
  const { scenario, topic } = resolve(conversationId);
  return { title: scenario?.title ?? topic?.title ?? 'Talk to Emma' };
}

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { scenario, topic } = resolve(conversationId);
  if (!scenario && !topic) notFound();
  return <ChatScreen scenario={scenario} topic={topic} />;
}
