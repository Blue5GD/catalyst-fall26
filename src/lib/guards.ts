import type { SupabaseClient } from '@supabase/supabase-js';
import { safeNext } from './auth.ts';

/** What the guards need from a page. Astro's `Astro` global fits this. */
export interface GuardContext {
  locals: App.Locals;
  url: URL;
  redirect(path: string): Response;
}

export type SignedIn = {
  user: NonNullable<App.Locals['user']>;
  supabase: SupabaseClient;
};

function notConfigured(): Response {
  return new Response(
    "Sign-in isn't set up on this copy of the site. Copy .env.example to .env.local.",
    { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}

/** The signed-in participant, or a Response to return from the page. */
export function requireUser(ctx: GuardContext): SignedIn | Response {
  const { supabase, user } = ctx.locals;
  if (!supabase) return notConfigured();
  if (!user) {
    const next = safeNext(ctx.url.pathname + ctx.url.search);
    return ctx.redirect(`/signin?next=${encodeURIComponent(next)}`);
  }
  return { user, supabase };
}

/**
 * Like requireUser, but 'forbidden' for signed-in participants who aren't
 * admins. The page then sets a 403 status and shows a short message.
 */
export function requireAdmin(ctx: GuardContext): SignedIn | Response | 'forbidden' {
  const result = requireUser(ctx);
  if (result instanceof Response) return result;
  return result.user.role === 'admin' ? result : 'forbidden';
}
