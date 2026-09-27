import type { WordResult } from '@/lib/text/match';
import { cn } from '@/lib/utils';

/** Word-by-word pronunciation feedback: green = spot on, amber = close, grey = missed. */
export function SpokenResult({ words, heard }: { words: WordResult[]; heard: string }) {
  return (
    <div className="space-y-2 text-center">
      <p className="flex flex-wrap justify-center gap-1.5" lang="es">
        {words.map((w, i) => (
          <span
            key={`${w.word}-${i}`}
            className={cn(
              'rounded-lg px-2 py-0.5 text-lg font-extrabold',
              w.status === 'ok' && 'bg-sage-light text-sage-dark',
              w.status === 'close' && 'bg-honey-light text-honey-dark',
              w.status === 'missed' && 'bg-cream-deep text-ink-faint line-through decoration-2',
            )}
          >
            {w.word}
            <span className="sr-only">{w.status === 'ok' ? ' (good)' : w.status === 'close' ? ' (close)' : ' (missed)'}</span>
          </span>
        ))}
      </p>
      {heard && (
        <p className="text-sm text-ink-soft">
          I heard: <span lang="es" className="font-bold text-ink">“{heard}”</span>
        </p>
      )}
    </div>
  );
}
