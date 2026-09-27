'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * Full-screen activities (lessons, reviews, games, chats) render only once
 * saved progress has loaded; first-time visitors are sent to onboarding.
 */
export function useReadyPlayer(): boolean {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const onboarded = useGameStore((s) => s.profile.onboarded);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/welcome');
  }, [hydrated, onboarded, router]);

  return hydrated && onboarded;
}
