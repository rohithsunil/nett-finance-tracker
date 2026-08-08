import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const supabase = await getSupabaseServer();

  if (supabase && code) await supabase.auth.exchangeCodeForSession(code);

  const next = requestUrl.searchParams.get('next');
  const destination = next && next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
