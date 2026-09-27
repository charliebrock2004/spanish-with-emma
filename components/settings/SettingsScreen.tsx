'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { useCapabilities } from '@/components/providers/AppProviders';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, Segmented, Slider, Toggle } from '@/components/ui/primitives';
import { soundService } from '@/services/sound/SoundService';
import { SAVE_VERSION } from '@/store/gameStore';
import { Sheet } from '@/components/ui/Sheet';
import { useListener, useVoiceCapabilities, useVoiceStatus } from '@/components/voice/hooks';
import { useNow } from '@/lib/hooks/useNow';
import { cn } from '@/lib/utils';
import { voiceErrorMessage } from '@/services/voice/errors';
import { deviceTts } from '@/services/voice/deviceTts';
import type { DeviceVoice } from '@/services/voice/types';
import { voiceService } from '@/services/voice/VoiceService';
import { browserStorage } from '@/services/storage';
import { useGameStore } from '@/store/gameStore';
import type { DifficultySetting, EnginePreference, PronunciationDisplay, VoiceMode } from '@/types/settings';

const STORE_KEY = 'spanish-with-emma';

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-6 scroll-mt-6" aria-labelledby={`${id ?? title}-title`}>
      <h2 id={`${id ?? title}-title`} className="px-1 text-xs font-extrabold tracking-[0.14em] text-ink-soft uppercase">
        {title}
      </h2>
      <Card className="mt-2 divide-y divide-sand/60 px-5 py-1">{children}</Card>
    </section>
  );
}

function Row({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="py-4">
      <p className="font-bold">{label}</p>
      {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Device voices arrive late (especially on Safari). */
function useDeviceVoices() {
  const [voices, setVoices] = useState<{ es: DeviceVoice[]; en: DeviceVoice[] } | null>(null);
  useEffect(() => {
    let alive = true;
    const update = () => alive && setVoices({ es: deviceTts.listVoices('es'), en: deviceTts.listVoices('en') });
    const off = deviceTts.onVoicesChanged(update);
    void deviceTts.loadVoices().then(update);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return voices;
}

function VoicePicker({
  label,
  voices,
  value,
  onChange,
}: {
  label: string;
  voices: DeviceVoice[];
  value: string | null;
  onChange: (uri: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink-soft">{label}</span>
      <span className="relative mt-1 block">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-12 w-full appearance-none rounded-2xl border-2 border-sand bg-paper pr-10 pl-4 font-bold outline-none focus:border-terracotta"
        >
          <option value="">Best available{voices[0] ? ` (${voices[0].name})` : ''}</option>
          {voices.map((v) => (
            <option key={v.uri} value={v.uri}>
              {v.name} · {v.lang}
              {v.scottish ? ' · Scottish' : ''}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-faint" />
      </span>
    </label>
  );
}

function MicTest() {
  const listener = useListener('es-ES');
  const [heard, setHeard] = useState<string | null>(null);
  const caps = useVoiceCapabilities();
  const listening = listener.state === 'listening';

  const test = async () => {
    setHeard(null);
    const result = await listener.start();
    if (result) setHeard(result.transcripts[0] || '(nothing)');
  };

  if (caps.ready && !caps.canListen) {
    return (
      <p className="rounded-2xl bg-honey-light px-4 py-3 text-sm font-bold text-honey-dark">
        This browser can&rsquo;t do speech recognition, so speaking exercises become typing. On iPhone, use Safari; on Android, Chrome.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Button
          variant={listening ? 'dark' : 'secondary'}
          onClick={listening ? listener.stop : test}
          icon={<Icon name={listening ? 'stop' : 'mic'} size={18} />}
          disabled={listener.state === 'processing'}
        >
          {listening ? 'Stop' : listener.state === 'processing' ? 'Listening…' : 'Test microphone'}
        </Button>
        {listening && (
          <span className="flex h-8 flex-1 items-center gap-1" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-terracotta transition-[height] duration-100"
                style={{ height: `${Math.max(12, Math.min(100, listener.level * 140 * (0.6 + ((i * 7) % 5) / 10)))}%` }}
              />
            ))}
          </span>
        )}
      </div>
      {listening && <p className="mt-2 text-sm text-ink-soft">Say something in Spanish — try &ldquo;Hola, me llamo…&rdquo;</p>}
      {heard !== null && (
        <p className="mt-3 rounded-2xl bg-sage-light px-4 py-3 text-sm">
          <span className="font-bold text-sage-dark">✓ It works! I heard:</span>{' '}
          <span lang="es" className="spanish">
            {heard}
          </span>
        </p>
      )}
      {listener.error && (
        <p className="mt-3 rounded-2xl bg-honey-light px-4 py-3 text-sm font-bold text-honey-dark" role="alert">
          {voiceErrorMessage(listener.error)}
          {listener.error.code === 'permission-denied' && (
            <span className="mt-1 block font-semibold">
              iPhone: Settings → Safari → Microphone → Allow (or tap “aA” in the address bar → Website Settings).
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function AccessCode() {
  const saved = useGameStore((s) => s.settings.accessCode);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const [draft, setDraft] = useState(saved);
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'wrong' | 'error'>('idle');

  const save = async () => {
    const code = draft.trim();
    setState('checking');
    try {
      const res = await fetch('/api/access', { method: 'POST', headers: code ? { 'x-access-code': code } : {} });
      if (res.ok) {
        updateSettings({ accessCode: code });
        setState('ok');
      } else setState(res.status === 401 ? 'wrong' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex gap-2">
        <label htmlFor="access-code" className="sr-only">
          Access code
        </label>
        <input
          id="access-code"
          type="password"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setState('idle');
          }}
          autoComplete="off"
          placeholder="Access code"
          className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-sand bg-paper px-4 font-bold outline-none focus:border-terracotta"
        />
        <Button type="submit" disabled={state === 'checking'}>
          {state === 'checking' ? 'Checking…' : 'Save'}
        </Button>
      </div>
      {state === 'ok' && <p className="mt-2 text-sm font-bold text-sage-dark">✓ Code accepted — AI chat and natural voices are unlocked.</p>}
      {state === 'wrong' && <p className="mt-2 text-sm font-bold text-brick">That code isn&rsquo;t right. Ask whoever set up this app.</p>}
      {state === 'error' && <p className="mt-2 text-sm font-bold text-honey-dark">Couldn&rsquo;t check the code — are you online?</p>}
    </form>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const caps = useCapabilities();
  const settings = useGameStore((s) => s.settings);
  const name = useGameStore((s) => s.profile.name);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setName = useGameStore((s) => s.setName);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const voices = useDeviceVoices();
  const { speaking } = useVoiceStatus();
  const now = useNow();
  const [nameDraft, setNameDraft] = useState(name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importState, setImportState] = useState<{ data: string; summary: string } | { error: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const pausedUntil = settings.speakingPausedUntil && now && settings.speakingPausedUntil > now ? settings.speakingPausedUntil : null;
  const scottishAvailable = voices?.en.some((v) => v.scottish) ?? false;

  const testVoice = () => {
    void voiceService.say(`*¡Hola, ${name || 'amigo'}!* I'm Emma. *¿Qué tal estás?* Let's learn some Spanish together.`, { includeEnglish: true, style: 'cheerful' });
  };

  const exportProgress = () => {
    const raw = browserStorage.getItem(STORE_KEY);
    const text = typeof raw === 'string' ? raw : JSON.stringify({ state: {}, version: SAVE_VERSION });
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spanish-with-emma-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const readImport = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error('too big');
      const text = await file.text();
      const parsed = JSON.parse(text) as { version?: unknown; state?: { profile?: { name?: unknown; onboarded?: unknown }; xp?: unknown } };
      const state = parsed.state;
      if (!state || typeof state !== 'object' || typeof state.xp !== 'number' || typeof state.profile?.onboarded !== 'boolean') {
        throw new Error('shape');
      }
      const who = typeof state.profile.name === 'string' && state.profile.name ? state.profile.name : 'this learner';
      // Keep the file's own version, so a current save is never "upgraded" (and paid) twice.
      const version = typeof parsed.version === 'number' && parsed.version >= 1 && parsed.version <= SAVE_VERSION ? parsed.version : 1;
      setImportState({ data: JSON.stringify({ state, version }), summary: `Progress for ${who} · ${state.xp} XP` });
    } catch {
      setImportState({ error: 'That file doesn’t look like a Spanish with Emma progress file.' });
    }
  };

  const applyImport = async (data: string) => {
    browserStorage.setItem(STORE_KEY, data);
    await useGameStore.persist.rehydrate();
    setImportState(null);
    router.push('/');
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader
        title="Settings"
        action={
          <Button variant="ghost" size="sm" onClick={() => router.push('/profile')} icon={<Icon name="arrowLeft" size={18} />}>
            Profile
          </Button>
        }
      />

      <Section id="voice" title="Emma’s voice">
        <Row
          label="Voice mode"
          description={
            settings.voiceMode === 'spanish'
              ? 'Emma speaks only Spanish out loud. Her English help stays on screen — full immersion.'
              : settings.voiceMode === 'scottish'
                ? 'Emma explains in her Scottish English voice and says the Spanish in a Castilian accent.'
                : 'Scottish English help while you’re a beginner (Levels 1–3), then Spanish only.'
          }
        >
          <Segmented<VoiceMode>
            label="Voice mode"
            value={settings.voiceMode}
            onChange={(voiceMode) => updateSettings({ voiceMode })}
            options={[
              { value: 'spanish', label: '🇪🇸 Spanish' },
              { value: 'scottish', label: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
        </Row>
        <div className="py-3">
          <Slider
            label="Speech speed"
            value={settings.speechRate}
            min={0.6}
            max={1.2}
            step={0.05}
            onChange={(speechRate) => updateSettings({ speechRate })}
            format={(v) => (v < 0.8 ? 'Slow' : v < 0.95 ? 'Relaxed' : v < 1.08 ? 'Natural' : 'Quick')}
          />
          <Button variant="soft" size="sm" className="mt-2" onClick={testVoice} icon={<Icon name="speaker" size={16} />} disabled={speaking}>
            {speaking ? 'Speaking…' : 'Hear Emma'}
          </Button>
        </div>
        {caps.cloudTts && (
          <Row
            label="Voice engine"
            description="Natural voices come from the server and sound more human; device voices also work without a connection."
          >
            <Segmented<EnginePreference>
              label="Voice engine"
              value={settings.ttsEngine}
              onChange={(ttsEngine) => updateSettings({ ttsEngine })}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'cloud', label: 'Natural' },
                { value: 'device', label: 'Device' },
              ]}
            />
          </Row>
        )}
        {voices && (voices.es.length > 0 || voices.en.length > 0) && (
          <Row label="Device voices" description="Used when Emma speaks with your phone’s built-in voices.">
            <div className="space-y-3">
              <VoicePicker label="Spanish" voices={voices.es} value={settings.spanishVoiceURI} onChange={(spanishVoiceURI) => updateSettings({ spanishVoiceURI })} />
              <VoicePicker label="English" voices={voices.en} value={settings.englishVoiceURI} onChange={(englishVoiceURI) => updateSettings({ englishVoiceURI })} />
            </div>
            {!scottishAvailable && (
              <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
                <span className="font-bold text-ink">Want Emma&rsquo;s Scottish voice?</span> On iPhone: Settings → Accessibility → Spoken Content →
                Voices → English → <strong>Fiona</strong> (Scotland). Download it, then come back here.
              </p>
            )}
          </Row>
        )}
        <Toggle
          label="Expressive voice"
          description="Emma sounds brighter when she celebrates and softer when she corrects you. Off keeps her calm and even."
          checked={settings.expressiveVoice}
          onChange={(expressiveVoice) => updateSettings({ expressiveVoice })}
        />
        <Toggle
          label="Play audio automatically"
          description="Emma reads new words and questions aloud."
          checked={settings.autoplayAudio}
          onChange={(autoplayAudio) => updateSettings({ autoplayAudio })}
        />
      </Section>

      <Section id="speaking" title="Speaking">
        <Row label="Microphone test" description="Check Emma can hear you before a speaking exercise.">
          <MicTest />
        </Row>
        {caps.cloudStt && (
          <Row label="Speech recognition" description="Server recognition is more accurate for accents; the device one is instant.">
            <Segmented<EnginePreference>
              label="Speech recognition"
              value={settings.sttEngine}
              onChange={(sttEngine) => updateSettings({ sttEngine })}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'cloud', label: 'Server' },
                { value: 'device', label: 'Device' },
              ]}
            />
          </Row>
        )}
        <Row
          label="Can’t talk right now?"
          description={
            pausedUntil
              ? `Speaking exercises are typed instead until ${new Date(pausedUntil).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`
              : 'On the bus or in a quiet office? Turn speaking exercises into typing for an hour.'
          }
        >
          {pausedUntil ? (
            <Button variant="secondary" size="sm" onClick={() => updateSettings({ speakingPausedUntil: null })}>
              Speak again now
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => updateSettings({ speakingPausedUntil: Date.now() + 60 * 60 * 1000 })}>
              Pause speaking for an hour
            </Button>
          )}
        </Row>
      </Section>

      <Section id="learning" title="Learning">
        <Row
          label="Difficulty"
          description={
            settings.difficulty === 'auto' ? 'Emma adjusts to how you’re doing — more help when it’s tricky, more challenge when you’re flying.' : undefined
          }
        >
          <Segmented<DifficultySetting>
            label="Difficulty"
            value={settings.difficulty}
            onChange={(difficulty) => updateSettings({ difficulty })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'easier', label: 'Easier' },
              { value: 'normal', label: 'Normal' },
              { value: 'harder', label: 'Harder' },
            ]}
          />
        </Row>
        <Row label="Daily goal" description="Minutes of Spanish a day. Little and often beats cramming.">
          <Segmented<string>
            label="Daily goal"
            value={String(settings.dailyGoalMinutes)}
            onChange={(v) => updateSettings({ dailyGoalMinutes: Number(v) })}
            options={['5', '10', '15', '20'].map((v) => ({ value: v, label: `${v} min` }))}
          />
        </Row>
        <Row label="Pronunciation guides" description="Hints like “OH-la” under new words. Auto shows them for new words and fades them out as you advance.">
          <Segmented<PronunciationDisplay>
            label="Pronunciation guides"
            value={settings.showPronunciation}
            onChange={(showPronunciation) => updateSettings({ showPronunciation })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'always', label: 'Always' },
              { value: 'never', label: 'Never' },
            ]}
          />
        </Row>
      </Section>

      <Section id="sound" title="Sound & display">
        <Toggle label="Sound effects" description="Little chimes for right answers, combos, coins and rewards." checked={settings.soundEffects} onChange={(soundEffects) => updateSettings({ soundEffects })} />
        {settings.soundEffects && (
          <div className="pb-2">
            <Slider
              label="Effects volume"
              value={settings.soundVolume}
              min={0.1}
              max={1}
              step={0.1}
              onChange={(soundVolume) => {
                updateSettings({ soundVolume });
                soundService.setVolume(soundVolume);
                soundService.play('coin');
              }}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        )}
        <Toggle label="Music" description="A gentle Spanish guitar loop on the menus." checked={settings.music} onChange={(music) => updateSettings({ music })} />
        <Toggle label="Reduce motion" description="Fewer animations and no confetti." checked={settings.reduceMotion} onChange={(reduceMotion) => updateSettings({ reduceMotion })} />
      </Section>

      <Section id="you" title="You">
        <Row label="Your name" description="Emma uses it when she talks to you.">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (nameDraft.trim()) setName(nameDraft.trim().slice(0, 30));
            }}
          >
            <label htmlFor="settings-name" className="sr-only">
              Your name
            </label>
            <input
              id="settings-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={30}
              autoComplete="given-name"
              className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-sand bg-paper px-4 font-bold outline-none focus:border-terracotta"
            />
            <Button type="submit" variant="secondary" disabled={!nameDraft.trim() || nameDraft.trim() === name}>
              Save
            </Button>
          </form>
        </Row>
        {caps.accessCodeRequired && (
          <div id="access" className="scroll-mt-6">
            <Row label="Access code" description="This app is private — the code unlocks free chat with Emma and natural voices.">
              <AccessCode />
            </Row>
          </div>
        )}
      </Section>

      <Section id="data" title="Your progress">
        <Row label="Back up or move your progress" description="Progress is saved on this device. Download it to keep a copy or move to another phone.">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportProgress} icon={<Icon name="download" size={16} />}>
              Download
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              Restore from file
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readImport(file);
                e.target.value = '';
              }}
            />
          </div>
          {importState && 'error' in importState && <p className="mt-2 text-sm font-bold text-brick">{importState.error}</p>}
        </Row>
        <Row label="Start over" description="Deletes your XP, streak, words and achievements on this device. Your settings stay.">
          <Button variant="ghost" size="sm" className="text-brick" onClick={() => setConfirmReset(true)} icon={<Icon name="trash" size={16} />}>
            Reset progress
          </Button>
        </Row>
      </Section>

      <Section title="About">
        <div className="flex items-center gap-3 py-4">
          <EmmaAvatar size={48} animated={false} />
          <div className="text-sm">
            <p className="font-extrabold">Spanish with Emma</p>
            <p className="text-ink-soft">European Spanish, from ¡hola! to real conversations.</p>
          </div>
        </div>
        <ul className="space-y-1.5 py-4 text-sm">
          <li className="flex justify-between gap-4">
            <span className="text-ink-soft">Free chat with Emma</span>
            <span className={cn('font-bold', caps.aiChat ? 'text-sage-dark' : 'text-ink-faint')}>{caps.aiChat ? 'On' : 'Off (no AI key)'}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-ink-soft">Natural cloud voices</span>
            <span className={cn('font-bold', caps.cloudTts ? 'text-sage-dark' : 'text-ink-faint')}>
              {caps.cloudTts ? `On — ${caps.ttsProvider === 'elevenlabs' ? 'ElevenLabs' : caps.ttsProvider === 'openai' ? 'OpenAI' : 'server'}` : 'Off — device voices'}
            </span>
          </li>
          {caps.ttsVoice === 'fallback' && (
            <li className="rounded-xl bg-cream px-3 py-2 text-xs text-ink-soft">
              ElevenLabs is using its stand-in British voice. Set <code>EMMA_VOICE_ID</code> on the server to give Emma her Scottish voice (see the README).
            </li>
          )}
          <li className="flex justify-between gap-4">
            <span className="text-ink-soft">Server speech recognition</span>
            <span className={cn('font-bold', caps.cloudStt ? 'text-sage-dark' : 'text-ink-faint')}>{caps.cloudStt ? 'On' : 'Off — device only'}</span>
          </li>
        </ul>
      </Section>
      <div className="h-6" />

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} label="Reset progress?">
        <div className="text-center">
          <EmmaAvatar state="surprised" size={80} className="mx-auto" />
          <h2 className="mt-3 font-display text-2xl font-semibold">Start from scratch?</h2>
          <p className="mt-2 text-ink-soft">This can&rsquo;t be undone. If you might want it back, download a copy first.</p>
        </div>
        <div className="mt-6 space-y-3">
          <Button size="lg" block variant="secondary" onClick={() => setConfirmReset(false)}>
            Keep my progress
          </Button>
          <Button
            size="lg"
            block
            className="bg-brick shadow-[0_4px_0_#5e1f16]"
            onClick={() => {
              resetProgress();
              setConfirmReset(false);
              router.replace('/welcome');
            }}
          >
            Yes, reset everything
          </Button>
        </div>
      </Sheet>

      <Sheet open={importState !== null && 'data' in importState} onClose={() => setImportState(null)} label="Restore progress?">
        {importState && 'data' in importState && (
          <>
            <h2 className="font-display text-2xl font-semibold">Restore this progress?</h2>
            <p className="mt-2 text-ink-soft">{importState.summary}. It replaces what&rsquo;s on this device now.</p>
            <div className="mt-6 space-y-3">
              <Button size="lg" block onClick={() => void applyImport(importState.data)}>
                Restore
              </Button>
              <Button size="lg" block variant="secondary" onClick={() => setImportState(null)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
