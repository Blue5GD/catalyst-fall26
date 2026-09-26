import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;

  // Static pages are built ahead of time and have no request cookies.
  if (context.isPrerendered) return next();

  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;
  if (!supabase) return next();

  // getClaims verifies the session token instead of trusting the cookie as-is.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (claims) {
    // Name and NetID come from the participants row, not the token's
    // user_metadata, which users can edit themselves.
    const { data: participant } = await supabase
      .from('participants')
      .select('name, netid, role')
      .eq('id', claims.sub)
      .maybeSingle();

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
  // Pages that know who you are must never be cached for someone else.
  if (context.locals.user) response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
