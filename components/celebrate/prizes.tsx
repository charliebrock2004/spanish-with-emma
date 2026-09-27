import { ItemPreview, RARITY } from '@/components/shop/ItemPreview';
import { CoinIcon, XpIcon } from '@/components/game-ui/icons';
import { ITEMS_BY_ID } from '@/data/shop';
import type { ChestPrize, ResolvedPrize } from '@/lib/game/chests';
import { cn, formatNumber } from '@/lib/utils';

const CATEGORY_NAME: Record<string, string> = {
  outfit: 'Outfit for Emma',
  background: 'Background',
  frame: 'Avatar frame',
  bubble: 'Chat bubble',
  theme: 'App theme',
  scene: 'Conversation scene',
};

/** One prize from a chest (or reward), as a card. */
export function PrizeCard({ prize, className }: { prize: ResolvedPrize; className?: string }) {
  let icon: React.ReactNode;
  let title: string;
  let detail: string;
  let tone = 'bg-paper';
  switch (prize.type) {
    case 'coins':
      icon = <CoinIcon size={44} />;
      title = `${formatNumber(prize.amount)} coins`;
      detail = 'Spend them in the shop';
      tone = 'bg-[#fff4d6]';
      break;
    case 'xp':
      icon = <XpIcon size={44} />;
      title = `${formatNumber(prize.amount)} XP`;
      detail = 'Straight into your level';
      tone = 'bg-sun-light';
      break;
    case 'boost':
      icon = <span className="text-4xl leading-none">⚡</span>;
      title = `${prize.minutes} min double XP`;
      detail = 'Starts now — go play!';
      tone = 'bg-sun-light';
      break;
    case 'freeze':
      icon = <span className="text-4xl leading-none">❄️</span>;
      title = 'Streak freeze';
      detail = 'Protects your streak for a day';
      tone = 'bg-sky-light';
      break;
    case 'item': {
      const item = ITEMS_BY_ID.get(prize.itemId);
      if (!item) return null;
      icon = <ItemPreview item={item} size={56} />;
      title = item.name;
      detail = `${RARITY[item.rarity].label} · ${CATEGORY_NAME[item.category] ?? 'Item'}`;
      tone = 'bg-paper ring-2 ' + RARITY[item.rarity].ring;
      break;
    }
  }
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left shadow-card', tone, className)}>
      <span className="grid h-14 w-14 shrink-0 place-items-center">{icon}</span>
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-black text-ink">{title}</span>
        <span className="block text-sm font-bold text-ink-soft">{detail}</span>
      </span>
    </div>
  );
}

/** Plain-words description of a chest prize, for the published odds. */
export function describePrize(prize: ChestPrize): string {
  switch (prize.type) {
    case 'coins':
      return `${prize.amount} coins`;
    case 'xp':
      return `${prize.amount} XP`;
    case 'boost':
      return `${prize.minutes} min double XP`;
    case 'freeze':
      return 'A streak freeze (or 100 coins if you hold 2)';
    case 'item':
      return `A ${prize.rarity} cosmetic you don't own (or coins if you own them all)`;
  }
}
