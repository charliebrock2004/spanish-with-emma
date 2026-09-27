'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { Hud } from '@/components/game-ui/parts';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: IconName | 'emma';
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home', match: (p) => p === '/' || p.startsWith('/quests') || p.startsWith('/shop') },
  { href: '/learn', label: 'Learn', icon: 'map', match: (p) => p.startsWith('/learn') },
  { href: '/emma', label: 'Emma', icon: 'emma', match: (p) => p.startsWith('/emma') },
  { href: '/review', label: 'Review', icon: 'book', match: (p) => p.startsWith('/review') || p.startsWith('/play') },
  { href: '/profile', label: 'Profile', icon: 'user', match: (p) => p.startsWith('/profile') || p.startsWith('/settings') },
];

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sand/70 bg-paper/95 backdrop-blur-md safe-bottom md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5">
        {NAV.map((item) => {
          const active = item.match(pathname);
          if (item.icon === 'emma') {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="group -mt-6 flex flex-col items-center gap-0.5"
                >
                  <span
                    className={cn(
                      'rounded-full p-[3px] shadow-lift transition-transform duration-200 group-active:scale-95',
                      active ? 'bg-terracotta' : 'bg-paper',
                    )}
                  >
                    <EmmaAvatar size={50} animated={false} decorative />
                  </span>
                  <span className={cn('text-[11px] font-extrabold', active ? 'text-terracotta' : 'text-ink-soft')}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors',
                  active ? 'text-terracotta' : 'text-ink-faint hover:text-ink-soft',
                )}
              >
                <span className={cn('grid h-8 w-12 place-items-center rounded-full transition-colors', active && 'bg-terracotta-light')}>
                  <Icon name={item.icon} size={22} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="text-[11px] font-extrabold">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const SIDE_EXTRA: NavItem[] = [
  { href: '/quests', label: 'Quests', icon: 'scroll', match: (p) => p.startsWith('/quests') },
  { href: '/shop', label: 'Shop', icon: 'bag', match: (p) => p.startsWith('/shop') },
];

function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 px-5 py-8 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-3 px-2">
        <EmmaAvatar size={44} animated={false} decorative />
        <span className="font-display text-xl leading-tight font-semibold">
          Spanish <span className="text-terracotta italic">with</span> Emma
        </span>
      </Link>
      {[...NAV.slice(0, 1).map((n) => ({ ...n, match: (p: string) => p === '/' })), ...NAV.slice(1), ...SIDE_EXTRA].map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-12 items-center gap-3 rounded-2xl px-4 font-extrabold transition-colors',
              active ? 'bg-terracotta-light text-terracotta-dark' : 'text-ink-soft hover:bg-cream-deep hover:text-ink',
            )}
          >
            {item.icon === 'emma' ? (
              <EmmaAvatar size={26} animated={false} decorative />
            ) : (
              <Icon name={item.icon} size={22} />
            )}
            {item.label === 'Emma' ? 'Talk to Emma' : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Loading state while saved progress is read from the device. */
export function ScreenSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-40 rounded-[var(--radius-card)]" />
      <div className="skeleton h-28 rounded-[var(--radius-card)]" />
      <div className="skeleton h-28 rounded-[var(--radius-card)]" />
    </div>
  );
}

/** Tab-screen frame: navigation, hydration gate and first-run redirect. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const onboarded = useGameStore((s) => s.profile.onboarded);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/welcome');
  }, [hydrated, onboarded, router]);

  const ready = hydrated && onboarded;

  return (
    <div className="paper flex min-h-dvh">
      <SideNav pathname={pathname} />
      <main id="main" className="min-w-0 flex-1 pb-28 md:pb-10">
        <div className="sticky top-0 z-30 border-b border-sand/40 bg-cream/90 backdrop-blur-md safe-top">
          <div className="mx-auto max-w-2xl px-4 py-2">{ready ? <Hud /> : <div className="h-11" aria-hidden />}</div>
        </div>
        {ready ? children : <ScreenSkeleton />}
      </main>
      <BottomNav pathname={pathname} />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 px-5 pt-5 pb-2 md:pt-8">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
