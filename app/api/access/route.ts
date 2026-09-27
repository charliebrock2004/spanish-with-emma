import { serverConfig } from '@/lib/server/config';
import { guard } from '@/lib/server/guard';

/**
 * POST /api/access — lets Settings confirm the access code (x-access-code
 * header) without spending anything. Tightly rate-limited against guessing.
 */
export async function POST(request: Request) {
  if (!serverConfig.accessCode) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  const blocked = guard(request, { bucket: 'access', limit: 10 });
  if (blocked) return blocked;
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
