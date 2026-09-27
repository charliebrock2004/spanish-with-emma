import type { ChatRequestBody, EmmaChatReply } from '@/types/chat';

export type ChatErrorCode = 'not-configured' | 'unauthorized' | 'rate-limited' | 'unavailable' | 'network';

export class ChatRequestError extends Error {
  readonly code: ChatErrorCode;
  constructor(code: ChatErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Asks Emma (through our own /api/chat route — the AI key never leaves the server). */
export async function fetchEmmaReply(body: ChatRequestBody, accessCode: string, signal?: AbortSignal): Promise<EmmaChatReply> {
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessCode ? { 'x-access-code': accessCode } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ChatRequestError('network', 'No connection — check your internet and try again.');
  }
  if (res.ok) return (await res.json()) as EmmaChatReply;
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  const code: ChatErrorCode =
    res.status === 401 ? 'unauthorized' : res.status === 429 ? 'rate-limited' : data.error === 'not-configured' ? 'not-configured' : 'unavailable';
  throw new ChatRequestError(code, data.message ?? 'Emma is unavailable right now.');
}
