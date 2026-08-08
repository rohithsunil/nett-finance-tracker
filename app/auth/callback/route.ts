import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const supabase = await getSupabaseServer();
  const next = requestUrl.searchParams.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('verified', 'error');
      return NextResponse.redirect(loginUrl);
    }
  }

  if (destination) return NextResponse.redirect(new URL(destination, requestUrl.origin));

  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('verified', '1');
  return NextResponse.redirect(loginUrl);
}
