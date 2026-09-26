declare namespace App {
  interface Locals {
    /** Null on static pages and when Supabase isn't configured (no .env.local). */
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
    /** The signed-in participant, or null. Only set on pages rendered on demand. */
    user: {
      id: string;
      email: string;
      name: string;
      netid: string;
      role: 'participant' | 'admin';
    } | null;
  }
}
