import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import OnboardingFlow from '@/components/OnboardingFlow';

export default async function OnboardingPage() {
  const supabase = await getSupabaseServer();
  if (!supabase) redirect('/login?error=config');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?mode=signup');

  const [{ data: profile }, { data: workspace }] = await Promise.all([
    supabase.from('profiles').select('full_name, display_currency').eq('id', user.id).maybeSingle(),
    supabase.from('workspaces').select('id').eq('user_id', user.id).eq('is_default', true).eq('archived', false).maybeSingle(),
  ]);

  return <OnboardingFlow
    email={user.email || ''}
    initialName={profile?.full_name || user.user_metadata?.full_name || ''}
    initialCurrency={profile?.display_currency || 'AED'}
    initialWorkspaceId={workspace?.id || null}
  />;
}
