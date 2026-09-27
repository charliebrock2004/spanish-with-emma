import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { serverConfig } from './config';

/**
 * Basic protection for the API routes that spend money on AI providers:
 *  - only this site's own pages may call them (same-origin checks),
 *  - an optional shared access code (APP_ACCESS_CODE),
 *  - a small per-IP rate limit.
 * For a public deployment, also consider Vercel's firewall rate limiting.
 */

const hits = new Map<string, number[]>();

function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((t) => now - t > windowMs)) hits.delete(k);
  }
  return recent.length > limit;
}

function sameSecret(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export function jsonError(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function guard(request: Request, { bucket, limit, windowMs = 60_000 }: { bucket: string; limit: number; windowMs?: number }): Response | null {
  const site = request.headers.get('sec-fetch-site');
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) {
    return jsonError(403, 'forbidden', 'Cross-site requests are not allowed.');
  }
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    try {
      if (host && new URL(origin).host !== host) return jsonError(403, 'forbidden', 'Cross-origin requests are not allowed.');
    } catch {
      return jsonError(403, 'forbidden', 'Invalid origin.');
    }
  }
  if (serverConfig.accessCode && !sameSecret(request.headers.get('x-access-code') ?? '', serverConfig.accessCode)) {
    return jsonError(401, 'unauthorized', 'This app needs its access code. Add it in Settings.');
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  if (rateLimited(`${bucket}:${ip}`, limit, windowMs)) {
    return jsonError(429, 'rate-limited', 'Too many requests — give it a moment and try again.');
  }
  return null;
}
