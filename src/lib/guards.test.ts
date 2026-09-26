import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin, requireUser, type GuardContext } from './guards.ts';

const supabase = {} as NonNullable<App.Locals['supabase']>;
const participant = { id: 'u1', email: 'm@yale.edu', name: 'Maya', netid: 'mc1', role: 'participant' as const };
const admin = { ...participant, role: 'admin' as const };

function ctx(locals: Partial<App.Locals>, path = '/me'): GuardContext {
  return {
    locals: { supabase: null, user: null, ...locals },
    url: new URL(`https://catalyst.test${path}`),
    redirect: (to: string) => new Response(null, { status: 302, headers: { Location: to } }),
  };
}

test('requireUser returns 503 when Supabase is not configured', () => {
  const result = requireUser(ctx({ supabase: null }));
  assert.ok(result instanceof Response);
  assert.equal(result.status, 503);
});

test('requireUser redirects to sign-in with the current path', () => {
  const result = requireUser(ctx({ supabase }, '/admin?correct=4'));
  assert.ok(result instanceof Response);
  assert.equal(result.headers.get('Location'), '/signin?next=%2Fadmin%3Fcorrect%3D4');
});

test('requireUser returns the user and client when signed in', () => {
  const result = requireUser(ctx({ supabase, user: participant }));
  assert.deepEqual(result, { user: participant, supabase });
});

test('requireAdmin says forbidden for a participant', () => {
  assert.equal(requireAdmin(ctx({ supabase, user: participant })), 'forbidden');
});

test('requireAdmin returns the admin', () => {
  assert.deepEqual(requireAdmin(ctx({ supabase, user: admin })), { user: admin, supabase });
});

test('requireAdmin still redirects when signed out', () => {
  const result = requireAdmin(ctx({ supabase }, '/admin'));
  assert.ok(result instanceof Response);
  assert.equal(result.status, 302);
});
