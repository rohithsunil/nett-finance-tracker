import { redirect } from 'next/navigation';
import NettApp from '@/components/NettApp';
import ConfigurationRequired from '@/components/ConfigurationRequired';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await getSupabaseServer();
  if (!supabase) return <ConfigurationRequired />;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?mode=signup');

  const { count, error } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('archived', false);
  if (!error && (count ?? 0) === 0 && user.user_metadata?.nett_onboarding_completed !== true) redirect('/onboarding');

  return <NettApp />;
}
