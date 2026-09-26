import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;

  // Static pages are built ahead of time and have no request cookies.
  if (context.isPrerendered) return next();

  // TEMP signin-debug: remove once preview sign-in is fixed.
  const debug = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log('[signin-debug]', msg, JSON.stringify(extra));
  const cookieNames = (context.request.headers.get('Cookie') ?? '')
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean);
  debug('request', {
    method: context.request.method,
    path: context.url.pathname,
    host: context.request.headers.get('host'),
    origin: context.request.headers.get('origin'),
    astroOrigin: context.url.origin,
    cookieNames,
    supabaseHost: import.meta.env.PUBLIC_SUPABASE_URL ? new URL(import.meta.env.PUBLIC_SUPABASE_URL).host : null,
    hasKey: Boolean(import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  });

  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;
  if (!supabase) {
    debug('no supabase client');
    return next();
  }

  // getClaims verifies the session token instead of trusting the cookie as-is.
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  debug('getClaims', { hasClaims: Boolean(claims), sub: claims?.sub ?? null, error: claimsError?.message ?? null });

  if (claims) {
    // Name and NetID come from the participants row, not the token's
    // user_metadata, which users can edit themselves.
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('name, netid, role')
      .eq('id', claims.sub)
      .maybeSingle();
    debug('participant lookup', {
      found: Boolean(participant),
      role: participant?.role ?? null,
      error: participantError?.message ?? null,
    });

    if (participant) {
      context.locals.user = {
        id: claims.sub,
        email: claims.email ?? '',
        name: participant.name,
        netid: participant.netid,
        role: participant.role === 'admin' ? 'admin' : 'participant',
      };
    }
  }

  const response = await next();
  debug('response', {
    status: response.status,
    location: response.headers.get('location'),
    setCookieNames: [...context.cookies.headers()].map((c) => c.split('=')[0]),
    signedIn: Boolean(context.locals.user),
  });
  // Pages that know who you are must never be cached for someone else.
  if (context.locals.user) response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
