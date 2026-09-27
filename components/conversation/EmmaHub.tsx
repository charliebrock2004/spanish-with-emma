'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { PageHeader } from '@/components/layout/AppShell';
import { useCapabilities } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui/Icon';
import { Card, Chip } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { CHAT_TOPICS } from '@/data/conversations/topics';
import { curriculumLevel, useGameStore } from '@/store/gameStore';
import type { LevelId, LevelMeta } from '@/types/curriculum';
import type { ConversationRecord } from '@/types/progress';
import { cn } from '@/lib/utils';

export interface ScenarioCard {
  id: string;
  level: LevelId;
  emoji: string;
  title: string;
  description: string;
}

function formatWhen(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function TopicTile({ href, emoji, title, description, locked, lockLabel, tone }: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  locked: boolean;
  lockLabel: string;
  tone: string;
}) {
  const body = (
    <>
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="mt-2 block font-extrabold leading-tight">{title}</span>
      <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{description}</span>
      {locked && (
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-ink-faint">
          <Icon name="lock" size={13} /> {lockLabel}
        </span>
      )}
    </>
  );
  if (locked) {
    return (
      <div className={cn('rounded-2xl border border-sand/60 p-3.5 opacity-60', tone)} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={cn('rounded-2xl p-3.5 shadow-card transition-transform active:scale-[0.97]', tone)}>
      {body}
    </Link>
  );
}

function Transcript({ record, name }: { record: ConversationRecord; name: string }) {
  return (
    <div className="space-y-2.5">
      {record.messages.map((m, i) =>
        m.role === 'emma' ? (
          <div key={i} className="max-w-[85%] rounded-2xl rounded-bl-md bg-cream px-3.5 py-2.5">
            <p lang="es" className="spanish text-[15px] leading-snug">
              {m.text.replace(/\{name\}/g, name)}
            </p>
            {m.translation && <p className="mt-0.5 text-xs text-ink-soft">{m.translation.replace(/\{name\}/g, name)}</p>}
          </div>
        ) : (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-terracotta px-3.5 py-2.5 text-white">
            <p lang="es" className="text-[15px] leading-snug">
              {m.text}
            </p>
          </div>
        ),
      )}
    </div>
  );
}

export function EmmaHub({ scenarios, levels }: { scenarios: ScenarioCard[]; levels: LevelMeta[] }) {
  const caps = useCapabilities();
  const name = useGameStore((s) => s.profile.name);
  const level = useGameStore(curriculumLevel);
  const history = useGameStore((s) => s.conversations);
  const accessCode = useGameStore((s) => s.settings.accessCode);
  const [open, setOpen] = useState<ConversationRecord | null>(null);

  const doneScenarios = useMemo(() => new Set(history.filter((c) => c.mode === 'guided').map((c) => c.scenarioId)), [history]);
  const byLevel = useMemo(() => {
    const groups = new Map<LevelId, ScenarioCard[]>();
    for (const s of scenarios) groups.set(s.level, [...(groups.get(s.level) ?? []), s]);
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [scenarios]);

  // Suggest the first guided scene at the player's level they haven't done yet.
  const suggested =
    scenarios.find((s) => s.level === level && !doneScenarios.has(s.id)) ??
    [...scenarios].reverse().find((s) => s.level <= level && !doneScenarios.has(s.id)) ??
    scenarios.find((s) => s.level <= level);
  const needsCode = caps.aiChat && caps.accessCodeRequired && !accessCode.trim();

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader title="Talk to Emma" subtitle="Real conversations, at your level." />

      {/* Hero */}
      <section className="relative mt-3 min-h-[188px] animate-enter overflow-hidden rounded-[2rem] bg-ink px-5 pt-5 pb-5 text-cream">
        <div className="relative z-10 max-w-[62%]">
          <p lang="es" className="spanish font-display text-2xl leading-tight font-semibold">
            ¿De qué hablamos, {name || 'amigo'}?
          </p>
          <p className="mt-2 text-sm leading-snug text-cream/75">
            Tap the mic and just speak — or type if you&rsquo;d rather. I&rsquo;ll keep up, and I&rsquo;ll help when you get stuck.
          </p>
          {suggested && (
            <Link
              href={`/emma/${suggested.id}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-sun px-4 text-sm font-black text-ink shadow-[0_3px_0_var(--color-honey-dark)] active:translate-y-[2px] active:shadow-none"
            >
              <Icon name="mic" size={16} /> {suggested.title}
            </Link>
          )}
        </div>
        <EmmaPortrait state="happy" width={170} className="pointer-events-none absolute -right-4 -bottom-20 w-[44%] max-w-[200px]" />
      </section>

      {/* Free chat */}
      <section className="mt-6 animate-enter [animation-delay:60ms]" aria-labelledby="free-chat">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="free-chat" className="font-display text-xl font-semibold">
            Chat freely
          </h2>
          {caps.aiChat && <Chip className="bg-sage-light text-sage-dark">AI · adapts to Level {level}</Chip>}
        </div>
        {caps.aiChat ? (
          <>
            <p className="mt-1 px-1 text-sm text-ink-soft">Say anything. Emma replies, remembers what you tell her and corrects you gently.</p>
            {needsCode && (
              <Link href="/settings#access" className="mt-3 flex items-center gap-3 rounded-2xl bg-honey-light px-4 py-3 text-sm font-bold text-honey-dark">
                <Icon name="info" size={18} />
                <span className="flex-1">This app has an access code for AI chat. Add it in Settings first.</span>
                <Icon name="chevronRight" size={16} />
              </Link>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {CHAT_TOPICS.map((t) => (
                <TopicTile
                  key={t.id}
                  href={`/emma/ai-${t.id}`}
                  emoji={t.emoji}
                  title={t.title}
                  description={t.description}
                  locked={t.minLevel > level}
                  lockLabel={`From Level ${t.minLevel}`}
                  tone="bg-paper"
                />
              ))}
            </div>
          </>
        ) : (
          <Card className="mt-3 p-4">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream-deep text-lg" aria-hidden>
                💬
              </span>
              <div className="text-sm">
                <p className="font-extrabold">Open-ended AI chat is switched off</p>
                <p className="mt-1 text-ink-soft">
                  Free conversation needs an AI key on the server (<code className="text-[13px]">ANTHROPIC_API_KEY</code> — see the README).
                  The guided conversations below work without it.
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Guided */}
      <section className="mt-7 animate-enter [animation-delay:120ms]" aria-labelledby="guided">
        <h2 id="guided" className="px-1 font-display text-xl font-semibold">
          Guided conversations
        </h2>
        <p className="mt-1 px-1 text-sm text-ink-soft">Real situations with a little help. Emma remembers what you say.</p>
        <div className="mt-3 space-y-5">
          {byLevel.map(([lvl, list]) => {
            const meta = levels.find((l) => l.id === lvl);
            return (
              <div key={lvl}>
                <p className="mb-2 flex items-center gap-2 px-1 text-xs font-extrabold tracking-[0.14em] text-ink-soft uppercase">
                  <span aria-hidden>{meta?.emoji}</span> Level {lvl}
                  {meta && <span className="font-bold tracking-normal normal-case">· {meta.title}</span>}
                </p>
                <div className="space-y-2">
                  {list.map((s) => {
                    const locked = s.level > level;
                    const done = doneScenarios.has(s.id);
                    const inner = (
                      <>
                        <span
                          className={cn(
                            'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl',
                            locked ? 'bg-cream-deep grayscale' : 'bg-terracotta-light',
                          )}
                          aria-hidden
                        >
                          {s.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-extrabold leading-tight">{s.title}</span>
                          <span className="block text-[13px] leading-snug text-ink-soft">{s.description}</span>
                        </span>
                        {locked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-ink-faint">
                            <Icon name="lock" size={14} /> Level {s.level}
                          </span>
                        ) : done ? (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-sage text-white" aria-label="Done">
                            <Icon name="check" size={16} strokeWidth={3} />
                          </span>
                        ) : (
                          <Icon name="chevronRight" className="text-ink-faint" />
                        )}
                      </>
                    );
                    return locked ? (
                      <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-sand/60 px-3 py-3 opacity-60" aria-disabled="true">
                        {inner}
                      </div>
                    ) : (
                      <Link
                        key={s.id}
                        href={`/emma/${s.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-3 shadow-card transition-transform active:scale-[0.98]"
                      >
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent */}
      {history.length > 0 && (
        <section className="mt-7 animate-enter [animation-delay:180ms]" aria-labelledby="recent">
          <h2 id="recent" className="px-1 font-display text-xl font-semibold">
            Recent chats
          </h2>
          <div className="mt-3 space-y-2">
            {history.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpen(c)}
                className="flex w-full items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-left shadow-card active:scale-[0.99]"
              >
                <Icon name="chat" className="shrink-0 text-terracotta" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{c.title}</span>
                  <span className="block text-xs text-ink-soft">
                    {formatWhen(c.startedAt)} · {c.messages.filter((m) => m.role === 'player').length} replies
                  </span>
                </span>
                <Icon name="chevronRight" size={18} className="text-ink-faint" />
              </button>
            ))}
          </div>
        </section>
      )}

      <Sheet open={open !== null} onClose={() => setOpen(null)} label="Conversation transcript">
        {open && (
          <>
            <p className="text-xs font-extrabold tracking-[0.14em] text-ink-soft uppercase">{formatWhen(open.startedAt)}</p>
            <h2 className="font-display text-2xl font-semibold">{open.title}</h2>
            <div className="mt-4 max-h-[55dvh] overflow-y-auto pr-1">
              <Transcript record={open} name={name} />
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
