import type { EmailOtpType } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

export const prerender = false;

// Target of the "confirm your email" link. The token_hash link works on any
// device; it needs the email template in supabase/templates/confirmation.html
// (see docs/LEADS.md). The default ?code= link only works in the browser that
// signed up.
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const supabase = locals.supabase;
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');

  if (!supabase) return redirect('/signin', 303);

  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error('Missing confirmation token') };

  if (error) {
    console.error('Email confirmation failed:', error.message);
    return redirect('/signin?confirm=failed', 303);
  }
  // A confirmed sign-up gets the welcome screen. The ?code= link is only sent
  // for sign-ups, since there's no password reset page yet.
  const isSignup = tokenHash ? type === 'signup' : Boolean(code);
  return redirect(isSignup ? '/welcome' : '/', 303);
};
