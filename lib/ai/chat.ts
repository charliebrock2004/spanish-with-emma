import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { serverConfig } from '@/lib/server/config';
import type { ChatPromptInput, ChatTurn, EmmaChatReply, EmmaEmotion } from '@/types/chat';
import { buildSystemPrompt, EMMA_REPLY_SCHEMA } from './emmaPrompt';

export class ChatError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: serverConfig.anthropicKey, maxRetries: 1, timeout: 45_000 });
  return client;
}

/** Feature support differs between model families; keep ANTHROPIC_MODEL swappable. */
function modelFeatures(model: string) {
  const m = model.toLowerCase();
  return {
    effort: !/haiku|sonnet-4-5|opus-4-1|claude-3/.test(m),
    serverFallback: /opus-5|fable/.test(m),
  };
}

/** The Messages API alternates user/assistant and must start with the user. */
function toApiMessages(turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: '(The learner has just opened the chat with you.)' },
  ];
  for (const turn of turns) {
    const role = turn.role === 'emma' ? 'assistant' : 'user';
    const last = out[out.length - 1];
    if (last.role === role) last.content = `${last.content}\n${turn.text}`;
    else out.push({ role, content: turn.text });
  }
  if (out[out.length - 1].role !== 'user') out.push({ role: 'user', content: '(The learner is waiting for you to continue.)' });
  return out;
}

const EMOTIONS: EmmaEmotion[] = ['happy', 'encouraging', 'thinking', 'surprised', 'celebrating', 'confused'];
const CORRECTION_TYPES = ['grammar', 'vocabulary', 'word-order', 'spelling', 'none'] as const;

function normalise(raw: unknown): EmmaChatReply {
  const r = (raw ?? {}) as Record<string, unknown>;
  const c = (r.correction ?? {}) as Record<string, unknown>;
  const type = CORRECTION_TYPES.includes(c.type as (typeof CORRECTION_TYPES)[number]) ? (c.type as EmmaChatReply['correction']['type']) : 'none';
  const hasMistake = Boolean(c.has_mistake) && typeof c.corrected === 'string' && c.corrected.trim().length > 0;
  return {
    reply: typeof r.reply === 'string' && r.reply.trim() ? r.reply.trim() : '¿Perdona? ¿Puedes repetirlo?',
    translation: typeof r.translation === 'string' ? r.translation.trim() : '',
    correction: {
      hasMistake,
      corrected: hasMistake ? String(c.corrected).trim() : '',
      explanation: hasMistake && typeof c.explanation === 'string' ? c.explanation.trim() : '',
      type: hasMistake ? type : 'none',
    },
    suggestions: Array.isArray(r.suggestions)
      ? r.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 3)
      : [],
    emotion: EMOTIONS.includes(r.emotion as EmmaEmotion) ? (r.emotion as EmmaEmotion) : 'happy',
    understood: r.understood !== false,
    end: r.end === true,
  };
}

export async function generateEmmaReply(body: ChatPromptInput): Promise<EmmaChatReply> {
  const model = serverConfig.anthropicModel;
  const features = modelFeatures(model);
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic().beta.messages.create({
      model,
      max_tokens: 4000,
      system: buildSystemPrompt(body),
      messages: toApiMessages(body.messages),
      output_config: {
        ...(features.effort ? { effort: 'low' as const } : {}),
        format: { type: 'json_schema', schema: EMMA_REPLY_SCHEMA as unknown as Record<string, unknown> },
      },
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      ...(features.serverFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new ChatError(503, 'not-configured', 'The AI key on the server was rejected. Check ANTHROPIC_API_KEY.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ChatError(429, 'rate-limited', 'Emma is a bit busy — try again in a moment.');
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new ChatError(502, 'unavailable', 'Emma couldn’t process that conversation.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ChatError(502, 'unavailable', 'Couldn’t reach the AI service.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new ChatError(502, 'unavailable', 'The AI service had a problem.');
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    return normalise({
      reply: 'Mejor hablemos de otra cosa. ¿Qué tal tu día?',
      translation: "Let's talk about something else. How's your day going?",
      correction: { has_mistake: false },
      suggestions: ['Mi día va bien.', 'Estoy un poco cansado.'],
      emotion: 'thinking',
      understood: true,
      end: false,
    });
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  try {
    return normalise(JSON.parse(text));
  } catch {
    throw new ChatError(502, 'bad-output', 'Emma lost her train of thought — try again.');
  }
}
