import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunkForSpeech, prepareForSpeech } from '@/lib/voice/prepare';
import { cloudTts } from '@/services/voice/cloudTts';
import { deviceTts } from '@/services/voice/deviceTts';
import { VoiceError } from '@/services/voice/types';
import { voiceService } from '@/services/voice/VoiceService';

describe('speech preparation', () => {
  it('drops emoji, flags and markup', () => {
    expect(prepareForSpeech("You're on a roll 🔥", 'en')).toBe("You're on a roll");
    expect(prepareForSpeech('🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish voice', 'en')).toBe('Scottish voice');
    expect(prepareForSpeech('**Hola** _amigo_', 'es')).toBe('Hola amigo');
    expect(prepareForSpeech('Almost! ❤️ In Spanish we say…', 'en')).toBe('Almost! In Spanish we say...');
  });
  it('never reads UI instructions or placeholders', () => {
    expect(prepareForSpeech('[tap to hear] ¡Hola!', 'es')).toBe('¡Hola!');
    expect(prepareForSpeech('Say it (tap the mic) out loud', 'en')).toBe('Say it out loud');
    expect(prepareForSpeech('Hola {name}', 'es')).toBe('Hola');
  });
  it('expands abbreviations in each language', () => {
    expect(prepareForSpeech('El Sr. García y la Sra. López', 'es')).toBe('El señor García y la señora López');
    expect(prepareForSpeech('Son 4,50 €.', 'es')).toBe('Son 4,50 euros.');
    expect(prepareForSpeech('Earn 150 XP, e.g. in a game', 'en')).toBe('Earn 150 X P, for example in a game');
    expect(prepareForSpeech('Only 10 min a day', 'en')).toBe('Only 10 minutes a day');
  });
  it('tidies Spanish punctuation and turns dashes and line breaks into pauses', () => {
    expect(prepareForSpeech('¿ Qué tal ?', 'es')).toBe('¿Qué tal?');
    expect(prepareForSpeech('¡Hola — qué bien!', 'es')).toBe('¡Hola, qué bien!');
    expect(prepareForSpeech('Primera línea\nSegunda línea', 'es')).toBe('Primera línea. Segunda línea');
    expect(prepareForSpeech('«Vale» ¿', 'es')).toBe('Vale');
  });
  it('cuts long replies into sentence chunks that start quickly', () => {
    const text = prepareForSpeech(
      'Hola. Hoy vamos a hablar de tus planes para el fin de semana, de lo que te gusta hacer y de los sitios que quieres visitar. ¿Te parece bien? Me encanta Madrid en otoño, cuando las hojas cambian de color y hace un tiempo perfecto para pasear por el Retiro con un café.',
      'es',
    );
    const chunks = chunkForSpeech(text, 120);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(120);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
    expect(chunks[0].length).toBeLessThan(90);
  });
});

describe('voice service', () => {
  it('speaks only Spanish in Spanish-only mode and prepares every chunk', () => {
    voiceService.configure({ mode: 'spanish' });
    expect(voiceService.chunksFor('*¡Hola!* 👋 That means hello.')).toEqual([{ text: '¡Hola!', lang: 'es' }]);
    voiceService.configure({ mode: 'scottish' });
    expect(voiceService.chunksFor('*¡Hola!* 👋 That means hello.')).toEqual([
      { text: '¡Hola!', lang: 'es' },
      { text: 'That means hello.', lang: 'en' },
    ]);
  });
});

// ─── /api/tts ──────────────────────────────────────────────────────────────

const ENV_KEYS = [
  'ELEVENLABS_API_KEY',
  'EMMA_VOICE_ID',
  'EMMA_ENGLISH_VOICE_ID',
  'EMMA_SPANISH_VOICE_ID',
  'ELEVENLABS_VOICE_ID_EN',
  'ELEVENLABS_VOICE_ID_ES',
  'ELEVENLABS_MODEL',
  'EMMA_TTS_PROVIDER',
  'TTS_PROVIDER',
  'OPENAI_API_KEY',
  'APP_ACCESS_CODE',
] as const;

type Env = Partial<Record<(typeof ENV_KEYS)[number], string>>;

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function stubProviders(status: { elevenlabs?: number; openai?: number } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
      const code = url.includes('elevenlabs') ? (status.elevenlabs ?? 200) : (status.openai ?? 200);
      return code === 200 ? new Response(new Uint8Array([73, 68, 51]), { headers: { 'content-type': 'audio/mpeg' } }) : new Response('boom', { status: code });
    }),
  );
  return calls;
}

async function loadRoute(env: Env) {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  return import('@/app/api/tts/route');
}

function ttsRequest(query: Record<string, string>, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000/api/tts?${new URLSearchParams(query)}`, { headers: { host: 'localhost:3000', ...headers } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/api/tts', () => {
  it('uses ElevenLabs first, streaming, with Emma’s English and Spanish voices', async () => {
    const calls = stubProviders();
    const { GET } = await loadRoute({ ELEVENLABS_API_KEY: 'xi-secret', EMMA_ENGLISH_VOICE_ID: 'scot-voice', EMMA_SPANISH_VOICE_ID: 'madrid-voice', OPENAI_API_KEY: 'sk-secret' });
    const en = await GET(ttsRequest({ lang: 'en', text: 'Hello 👋 there!', style: 'excited' }));
    expect(en.status).toBe(200);
    expect(en.headers.get('content-type')).toBe('audio/mpeg');
    expect(en.headers.get('x-voice-provider')).toBe('elevenlabs');
    expect(calls[0].url).toContain('/v1/text-to-speech/scot-voice/stream');
    expect(calls[0].headers['xi-api-key']).toBe('xi-secret');
    expect(calls[0].body.text).toBe('Hello there!');
    expect((calls[0].body.voice_settings as { stability: number }).stability).toBeLessThan(0.4);
    await GET(ttsRequest({ lang: 'es', text: '¡Hola!' }));
    expect(calls[1].url).toContain('/v1/text-to-speech/madrid-voice/stream');
    // The key never comes back to the browser.
    expect(JSON.stringify([...en.headers])).not.toContain('secret');
  });

  it('lets one voice ID speak both languages, and falls back to a documented voice with none', async () => {
    let calls = stubProviders();
    let route = await loadRoute({ ELEVENLABS_API_KEY: 'xi', EMMA_VOICE_ID: 'emma-one' });
    await route.GET(ttsRequest({ lang: 'es', text: 'Hola' }));
    expect(calls[0].url).toContain('/emma-one/stream');
    vi.unstubAllGlobals();
    calls = stubProviders();
    route = await loadRoute({ ELEVENLABS_API_KEY: 'xi' });
    await route.GET(ttsRequest({ lang: 'en', text: 'Hello' }));
    const { ELEVENLABS_FALLBACK_VOICE } = await import('@/lib/server/config');
    expect(calls[0].url).toContain(`/${ELEVENLABS_FALLBACK_VOICE.id}/stream`);
  });

  it('falls back to OpenAI when ElevenLabs fails', async () => {
    const calls = stubProviders({ elevenlabs: 500 });
    const { GET } = await loadRoute({ ELEVENLABS_API_KEY: 'xi', EMMA_VOICE_ID: 'v', OPENAI_API_KEY: 'sk' });
    const res = await GET(ttsRequest({ lang: 'en', text: 'Hello', style: 'gentle' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-voice-provider')).toBe('openai');
    expect(calls[1].url).toContain('api.openai.com');
    expect(String(calls[1].body.instructions)).toMatch(/Scottish/);
    expect(String(calls[1].body.instructions)).toMatch(/gentle/);
  });

  it('honours EMMA_TTS_PROVIDER and pins the language on models that support it', async () => {
    let calls = stubProviders();
    let route = await loadRoute({ ELEVENLABS_API_KEY: 'xi', EMMA_VOICE_ID: 'v', OPENAI_API_KEY: 'sk', EMMA_TTS_PROVIDER: 'openai' });
    await route.GET(ttsRequest({ lang: 'es', text: 'Hola' }));
    expect(calls[0].url).toContain('api.openai.com');
    vi.unstubAllGlobals();
    calls = stubProviders();
    route = await loadRoute({ ELEVENLABS_API_KEY: 'xi', EMMA_VOICE_ID: 'v', ELEVENLABS_MODEL: 'eleven_flash_v2_5' });
    await route.GET(ttsRequest({ lang: 'es', text: 'Hola' }));
    expect(calls[0].body.language_code).toBe('es');
    expect(calls[0].body.model_id).toBe('eleven_flash_v2_5');
  });

  it('refuses when not configured, without the access code, or with nothing to say', async () => {
    stubProviders();
    let route = await loadRoute({});
    expect((await route.GET(ttsRequest({ lang: 'en', text: 'Hi' }))).status).toBe(503);
    route = await loadRoute({ ELEVENLABS_API_KEY: 'xi', APP_ACCESS_CODE: 'letmein' });
    expect((await route.GET(ttsRequest({ lang: 'en', text: 'Hi' }))).status).toBe(401);
    expect((await route.GET(ttsRequest({ lang: 'en', text: 'Hi' }, { 'x-access-code': 'letmein' }))).status).toBe(200);
    expect((await route.GET(ttsRequest({ lang: 'en', text: '🔥' }, { 'x-access-code': 'letmein' }))).status).toBe(400);
    expect((await route.GET(ttsRequest({ lang: 'en', text: 'Hi' }, { 'x-access-code': 'letmein', 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
  });
});

describe('voice fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    voiceService.configure({ cloudTts: false, expressive: true, mode: 'scottish' });
  });

  async function setup(cloudFails: boolean) {
    vi.spyOn(cloudTts, 'isSupported').mockReturnValue(true);
    vi.spyOn(cloudTts, 'cancel').mockImplementation(() => {});
    vi.spyOn(cloudTts, 'prefetch').mockImplementation(() => {});
    const cloud = vi.spyOn(cloudTts, 'speak').mockImplementation(async () => {
      if (cloudFails) throw new VoiceError('tts-failed');
    });
    vi.spyOn(deviceTts, 'isSupported').mockReturnValue(true);
    vi.spyOn(deviceTts, 'cancel').mockImplementation(() => {});
    const device = vi.spyOn(deviceTts, 'speak').mockResolvedValue(undefined);
    voiceService.configure({ cloudTts: true, ttsEngine: 'auto', mode: 'scottish' });
    return { cloud, device };
  }

  it('uses the cloud voice first, with the style of the moment', async () => {
    const { cloud, device } = await setup(false);
    expect(await voiceService.say('*¡Muy bien!*', { style: 'excited' })).toBe(true);
    expect(cloud).toHaveBeenCalledWith(expect.objectContaining({ text: '¡Muy bien!', lang: 'es', style: 'excited' }), expect.anything());
    expect(device).not.toHaveBeenCalled();
  });

  it('falls back to the device voice when the cloud voice fails', async () => {
    const { cloud, device } = await setup(true);
    expect(await voiceService.say('*¡Hola!* That means hello.')).toBe(true);
    expect(cloud).toHaveBeenCalled();
    expect(device).toHaveBeenCalledWith(expect.objectContaining({ text: '¡Hola!', lang: 'es' }), expect.anything());
    expect(device).toHaveBeenCalledWith(expect.objectContaining({ text: 'That means hello.', lang: 'en' }), expect.anything());
  });

  it('keeps Emma calm when expressive voice is off', async () => {
    const { cloud } = await setup(false);
    voiceService.configure({ expressive: false });
    await voiceService.say('*¡Genial!*', { style: 'excited' });
    expect(cloud).toHaveBeenCalledWith(expect.objectContaining({ style: 'neutral' }), expect.anything());
  });

  it('replays the last line, slower on request', async () => {
    const { cloud } = await setup(false);
    await voiceService.say('*Buenos días*');
    await voiceService.replay(0.7);
    const last = cloud.mock.calls.at(-1)![0];
    expect(last.text).toBe('Buenos días');
    expect(last.rate).toBeCloseTo(voiceService.getSettings().rate * 0.7);
  });
});
