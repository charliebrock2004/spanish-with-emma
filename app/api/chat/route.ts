import { ChatError, generateEmmaReply } from '@/lib/ai/chat';
import { serverConfig } from '@/lib/server/config';
import { guard, jsonError } from '@/lib/server/guard';
import { CHAT_TOPICS } from '@/data/conversations/topics';
import type { ChatPromptInput, ChatTurn } from '@/types/chat';
import type { LevelId } from '@/types/curriculum';

export const maxDuration = 60;

const MAX_TURNS = 30;
const MAX_TEXT = 600;

/** Validates the request. Only the conversation itself comes from the browser — never prompt text. */
function parseBody(input: unknown): ChatPromptInput | null {
  if (!input || typeof input !== 'object') return null;
  const b = input as Record<string, unknown>;
  const level = Number(b.level);
  if (!Number.isInteger(level) || level < 1 || level > 6) return null;
  if (!Array.isArray(b.messages)) return null;
  const messages: ChatTurn[] = [];
  for (const m of b.messages.slice(-MAX_TURNS)) {
    if (!m || typeof m !== 'object') return null;
    const { role, text } = m as Record<string, unknown>;
    if ((role !== 'emma' && role !== 'player') || typeof text !== 'string') return null;
    const trimmed = text.trim().slice(0, MAX_TEXT);
    if (trimmed) messages.push({ role, text: trimmed });
  }
  if (messages.length === 0) return null;
  const found = typeof b.topicId === 'string' ? CHAT_TOPICS.find((t) => t.id === b.topicId) : undefined;
  return {
    level: level as LevelId,
    // Names only: letters, spaces, hyphens and apostrophes.
    name: typeof b.name === 'string' ? b.name.replace(/[^\p{L}\p{M} '’-]/gu, '').trim().slice(0, 30) : '',
    messages,
    topic: found ? { id: found.id, title: found.title, brief: found.brief } : undefined,
    struggling: b.struggling === true,
  };
}

export async function POST(request: Request) {
  if (!serverConfig.anthropicKey) {
    return jsonError(503, 'not-configured', 'Free conversation needs ANTHROPIC_API_KEY on the server.');
  }
  const blocked = guard(request, { bucket: 'chat', limit: 30 });
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, 'bad-request', 'Invalid JSON body.');
  }
  const body = parseBody(raw);
  if (!body) return jsonError(400, 'bad-request', 'Invalid conversation.');

  try {
    const reply = await generateEmmaReply(body);
    return Response.json(reply, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ChatError) return jsonError(error.status, error.code, error.message);
    console.error('chat route failed', error);
    return jsonError(500, 'unavailable', 'Something went wrong.');
  }
}
