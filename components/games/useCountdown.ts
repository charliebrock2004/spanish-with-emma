'use client';

import { useEffect, useRef, useState } from 'react';

/** Seconds left in a timed game; calls `onDone` once when time is up. */
export function useCountdown(seconds: number, onDone: () => void): number {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (end - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        done.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds]);
  return left;
}
