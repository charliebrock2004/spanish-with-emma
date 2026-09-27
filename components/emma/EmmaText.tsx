import { Fragment } from 'react';
import { parseMarkup } from '@/lib/text/markup';
import type { Lang } from '@/types/curriculum';
import { cn, personalise } from '@/lib/utils';

/**
 * Renders Emma-markup: *Spanish* segments are styled and tagged lang="es" so
 * screen readers pronounce them in Spanish.
 */
export function EmmaText({
  text,
  name = '',
  lang = 'en',
  className,
  spanishClassName,
}: {
  text: string;
  name?: string;
  lang?: Lang;
  className?: string;
  spanishClassName?: string;
}) {
  const segments = parseMarkup(personalise(text, name), lang);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.lang === 'es' ? (
          <span key={i} lang="es" className={cn(lang === 'en' && 'spanish', spanishClassName)}>
            {seg.text}
          </span>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </span>
  );
}
