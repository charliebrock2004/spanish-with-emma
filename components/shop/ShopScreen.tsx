'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmmaBubble, SceneBackdrop, useEquipped } from '@/components/cosmetics/cosmetics';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { emmaLine } from '@/components/emma/lines';
import { CoinIcon } from '@/components/game-ui/icons';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AnimatedNumber } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { ITEMS_BY_ID, SHOP_ITEMS, SLOT_FOR, type ItemCategory, type ShopItem } from '@/data/shop';
import { MAX_BOOST_MINUTES } from '@/lib/game/economy';
import { BUY_MESSAGES, buyCheck, isOwned } from '@/lib/game/shop';
import { useNow } from '@/lib/hooks/useNow';
import { MAX_FREEZES } from '@/lib/progress/streak';
import { soundService } from '@/services/sound/SoundService';
import { useGameStore } from '@/store/gameStore';
import { cn, formatNumber } from '@/lib/utils';
import { ItemPreview, RARITY } from './ItemPreview';
import { PurchaseReveal } from './PurchaseReveal';

type Tab = 'outfits' | 'backgrounds' | 'frames' | 'bubbles' | 'themes' | 'scenes' | 'boosts';

const TABS: Array<{ id: Tab; label: string; categories: ItemCategory[] }> = [
  { id: 'outfits', label: 'Outfits', categories: ['outfit'] },
  { id: 'backgrounds', label: 'Backgrounds', categories: ['background'] },
  { id: 'frames', label: 'Frames', categories: ['frame'] },
  { id: 'bubbles', label: 'Bubbles', categories: ['bubble'] },
  { id: 'themes', label: 'Themes', categories: ['theme'] },
  { id: 'scenes', label: 'Scenes', categories: ['scene'] },
  { id: 'boosts', label: 'Boosts', categories: ['boost', 'freeze'] },
];

function unlockText(item: ShopItem): string {
  if (item.unlock?.level) return `Reach player level ${item.unlock.level}`;
  if (item.unlock?.streak) return `Keep a ${item.unlock.streak} day streak`;
  if (item.unlock?.weekly) return 'Win a weekly challenge';
  return 'Earn it by playing';
}

/** Emma trying on whatever's selected. */
function TryOn({ item }: { item: ShopItem | null }) {
  const equipped = useEquipped();
  const outfit = item?.category === 'outfit' ? item.id : equipped.outfit;
  const background = item?.category === 'background' ? item.id : equipped.background;
  const frame = item?.category === 'frame' ? item.id : equipped.frame;
  const bubble = item?.category === 'bubble' ? item.id : equipped.bubble;
  const theme = item?.category === 'theme' ? item : null;
  return (
    <div className="relative isolate h-56 overflow-hidden rounded-[2rem] shadow-lift">
      <SceneBackdrop id={background} />
      {/* Emma stands to the right so her line never covers her face. */}
      {item?.category === 'frame' ? (
        <div className="absolute inset-y-0 right-5 grid place-items-center">
          <EmmaAvatar framed frame={frame} outfit={outfit} background={background} size={132} state="happy" />
        </div>
      ) : (
        <EmmaPortrait state="happy" outfit={outfit} width={220} className="absolute -right-3 -bottom-10 w-[190px] drop-shadow-xl" />
      )}
      <div className="absolute top-4 left-3 max-w-[48%]">
        <EmmaBubble id={bubble} tail="right">
          <p className="text-sm leading-snug font-bold">
            {item ? (isTheme(item) ? 'Everything goes this colour. Fancy!' : '¿Qué te parece? What do you think?') : '¡Hola! Pick something and I’ll try it on.'}
          </p>
        </EmmaBubble>
      </div>
      {theme && (
        <span className="absolute bottom-4 left-3 rounded-2xl px-4 py-2 text-sm font-black text-white shadow-card" style={{ background: theme.swatch?.[0] }}>
          Continue
        </span>
      )}
    </div>
  );
}

const isTheme = (item: ShopItem) => item.category === 'theme';

/** What Emma can try on (exclusives stay a mystery until earned). */
const TRY_ON = new Set<ItemCategory>(['outfit', 'background', 'frame', 'bubble', 'theme']);

function ItemCard({ item, onSelect, selected }: { item: ShopItem; onSelect: () => void; selected: boolean }) {
  const owned = useGameStore((s) => s.inventory.owned);
  const equipped = useEquipped();
  const coins = useGameStore((s) => s.coins);
  const freezes = useGameStore((s) => s.streak.freezes);
  const has = isOwned(item.id, owned);
  const exclusive = item.price === undefined && !item.isDefault;
  const mystery = exclusive && !has;
  const slot = SLOT_FOR[item.category];
  const isEquipped = slot ? equipped[slot] === item.id : false;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center rounded-2xl border-2 bg-paper px-2 pt-3 pb-2.5 text-center shadow-card transition-transform active:scale-[0.97]',
        selected ? 'border-terracotta' : 'border-transparent',
      )}
      aria-label={mystery ? `Locked item: ${unlockText(item)}` : `${item.name}${isEquipped ? ', equipped' : has ? ', owned' : item.price ? `, ${item.price} coins` : ''}`}
      data-item={item.id}
    >
      <ItemPreview item={item} size={76} silhouette={mystery} />
      <span className="mt-2 block w-full truncate text-sm font-extrabold">{mystery ? '???' : item.name}</span>
      <span className={cn('mt-1 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase', RARITY[item.rarity].chip)}>{RARITY[item.rarity].label}</span>
      <span className="mt-2 flex min-h-7 items-center justify-center text-xs font-black">
        {isEquipped ? (
          <span className="inline-flex items-center gap-1 text-sage-dark">
            <Icon name="check" size={14} strokeWidth={3} /> Equipped
          </span>
        ) : has && !item.consumable ? (
          <span className="text-ink-soft">{item.category === 'scene' ? 'Owned · play it' : 'Owned'}</span>
        ) : mystery ? (
          <span className="leading-snug text-ink-faint">
            <Icon name="lock" size={12} className="mr-1 inline align-[-1px]" />
            {unlockText(item)}
          </span>
        ) : item.price !== undefined ? (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1', coins >= item.price ? 'bg-[#fff4d6] text-[#8f5d0f]' : 'bg-cream-deep text-ink-faint')}>
            <CoinIcon size={14} /> {formatNumber(item.price)}
            {item.category === 'freeze' && <span className="font-bold text-ink-soft"> · {freezes}/{MAX_FREEZES}</span>}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ItemSheet({ item, onClose, onBought }: { item: ShopItem; onClose: () => void; onBought: (item: ShopItem, previous: string | null) => void }) {
  const owned = useGameStore((s) => s.inventory.owned);
  const coins = useGameStore((s) => s.coins);
  const freezes = useGameStore((s) => s.streak.freezes);
  const boostUntil = useGameStore((s) => s.inventory.boostUntil);
  const purchase = useGameStore((s) => s.purchase);
  const equip = useGameStore((s) => s.equip);
  const equipped = useEquipped();
  const now = useNow();
  const [bought, setBought] = useState<string | null>(null);
  const has = isOwned(item.id, owned);
  const mystery = item.price === undefined && !item.isDefault && !has;
  const slot = SLOT_FOR[item.category];
  const isEquipped = slot ? equipped[slot] === item.id : false;
  const boostLeft = now && boostUntil && boostUntil > now ? Math.ceil((boostUntil - now) / 60_000) : 0;
  const check = buyCheck(item, { coins, owned, freezes, boostMinutesLeft: boostLeft });

  const buy = () => {
    const previous = slot ? (equipped[slot] ?? null) : null;
    const result = purchase(item.id);
    if (result.ok) {
      soundService.play('purchase');
      // Something Emma can wear goes straight on, with a proper reveal.
      if (slot && equip(item.id)) {
        onBought(item, previous);
        return;
      }
      setBought(emmaLine('purchase'));
    } else {
      soundService.play('incorrect');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <ItemPreview item={item} size={84} silhouette={mystery} />
        <div className="min-w-0">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase', RARITY[item.rarity].chip)}>{RARITY[item.rarity].label}</span>
          <h2 className="mt-1 font-display text-2xl leading-tight font-semibold">{mystery ? 'A mystery item' : item.name}</h2>
          <p className="text-ink-soft">{mystery ? `${unlockText(item)} to reveal it.` : item.description}</p>
        </div>
      </div>

      {bought ? (
        <div className="mt-5">
          <div className="flex items-center gap-3 rounded-2xl bg-sage-light px-4 py-3">
            <EmmaAvatar state="excited" size={44} outfit={item.category === 'outfit' ? item.id : undefined} decorative />
            <p className="font-bold text-sage-dark">{bought}</p>
          </div>
          <div className="mt-4 space-y-2">
            {slot && !isEquipped && (
              <Button
                size="lg"
                block
                onClick={() => {
                  equip(item.id);
                  soundService.play('reward');
                  onClose();
                }}
              >
                {item.category === 'outfit' ? 'Wear it now' : 'Use it now'}
              </Button>
            )}
            {item.category === 'scene' && (
              <Link href={`/emma/${item.id}`} className="block">
                <Button size="lg" block>
                  Play the scene
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="md" block onClick={onClose}>
              Keep browsing
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {has && !item.consumable ? (
            slot ? (
              <Button
                size="lg"
                block
                disabled={isEquipped}
                onClick={() => {
                  equip(item.id);
                  soundService.play('tap');
                  onClose();
                }}
              >
                {isEquipped ? 'Equipped' : 'Equip'}
              </Button>
            ) : item.category === 'scene' ? (
              <Link href={`/emma/${item.id}`} className="block">
                <Button size="lg" block>
                  Play the scene
                </Button>
              </Link>
            ) : null
          ) : mystery ? (
            <p className="flex items-center gap-2 rounded-2xl bg-cream-deep px-4 py-3 font-bold text-ink-soft">
              <Icon name="lock" size={18} /> Exclusive — can&rsquo;t be bought. {unlockText(item)}.
            </p>
          ) : item.price !== undefined ? (
            <>
              <Button size="lg" block disabled={!check.ok} onClick={buy} icon={<CoinIcon size={20} />}>
                Buy for {formatNumber(item.price)}
              </Button>
              {!check.ok && (
                <p className="text-center text-sm font-bold text-ink-soft">
                  {check.reason === 'coins' ? `You need ${formatNumber(item.price - coins)} more coins — keep playing!` : BUY_MESSAGES[check.reason]}
                </p>
              )}
              {check.ok && (
                <p className="text-center text-sm text-ink-soft">
                  You&rsquo;ll have {formatNumber(coins - item.price)} coins left.
                  {item.category === 'boost' && ` Boosts stack up to ${MAX_BOOST_MINUTES} minutes.`}
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ShopScreen() {
  const coins = useGameStore((s) => s.coins);
  const owned = useGameStore((s) => s.inventory.owned);
  // Deep links such as /shop?tab=boosts (the shop only renders in the browser, after saved data loads).
  const [tab, setTab] = useState<Tab>(() => {
    const wanted = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tab');
    return TABS.some((t) => t.id === wanted) ? (wanted as Tab) : 'outfits';
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ item: ShopItem; previous: string | null } | null>(null);

  const items = useMemo(() => SHOP_ITEMS.filter((i) => TABS.find((t) => t.id === tab)!.categories.includes(i.category)), [tab]);
  const previewItem = selected ? (ITEMS_BY_ID.get(selected) ?? null) : null;
  const sheetItem = sheet ? ITEMS_BY_ID.get(sheet) : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader
        title="Shop"
        subtitle="Cosmetics and conveniences — never shortcuts."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-lg font-black shadow-card" aria-label={`${coins} coins`}>
            <CoinIcon size={24} /> <AnimatedNumber value={coins} />
          </span>
        }
      />
      <div className="mt-3">
        <TryOn item={previewItem && TRY_ON.has(previewItem.category) && (previewItem.price !== undefined || isOwned(previewItem.id, owned)) ? previewItem : null} />
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Shop sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setSelected(null);
            }}
            className={cn(
              'min-h-10 shrink-0 rounded-full px-4 text-sm font-extrabold transition-colors',
              tab === t.id ? 'bg-ink text-cream' : 'bg-paper text-ink-soft shadow-card',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3" role="tabpanel">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            selected={selected === item.id}
            onSelect={() => {
              soundService.play('tap');
              setSelected(item.id);
              setSheet(item.id);
            }}
          />
        ))}
      </div>

      {tab === 'scenes' && (
        <p className="px-1 pb-4 text-sm text-ink-soft">Scenes are extra guided conversations — they appear in Talk to Emma once they&rsquo;re yours.</p>
      )}
      <p className="px-1 pb-6 text-xs text-ink-faint">
        Coins come from lessons, quests, streaks, games and chests. Nothing here makes lessons easier to skip, and there&rsquo;s nothing to buy with real money.
      </p>

      <Sheet open={Boolean(sheetItem)} onClose={() => setSheet(null)} label={sheetItem?.name ?? 'Item'}>
        {sheetItem && (
          <ItemSheet
            key={sheetItem.id}
            item={sheetItem}
            onClose={() => setSheet(null)}
            onBought={(item, previous) => {
              setSheet(null);
              setReveal({ item, previous });
            }}
          />
        )}
      </Sheet>
      {reveal && <PurchaseReveal key={reveal.item.id} item={reveal.item} previous={reveal.previous} onClose={() => setReveal(null)} />}
    </div>
  );
}
