'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, LockKeyhole, Sparkles, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import NettLogo from '@/components/NettLogo';

type Props = { email: string; initialName: string; initialCurrency: string; initialWorkspaceId: string | null };

const slides = [
  { eyebrow: 'Welcome', title: 'Your entire financial life, in one calm place.', copy: 'Accounts, pots, loans, holdings and bills — connected without making money feel like work.', icon: Wallet },
  { eyebrow: 'One view', title: 'See everything at a glance.', copy: 'A living net-worth view across countries and currencies, always grounded in balances you entered.', icon: Sparkles },
  { eyebrow: 'Save with intention', title: 'Grow your pots, one payment at a time.', copy: 'Keep personal loans and focused spend trackers separate, so every amount remains easy to understand.', icon: Check },
  { eyebrow: 'Private by design', title: 'Your numbers stay yours.', copy: 'Every record is isolated to your account and protected by Supabase row-level security.', icon: LockKeyhole },
];

export default function OnboardingFlow({ email, initialName, initialCurrency, initialWorkspaceId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const slide = slides[step];
  const Icon = slide.icon;

  async function finish() {
    setLoading(true);
    setError('');
    const supabase = getSupabaseBrowser();
    if (!supabase) { setError('Supabase is not configured for this deployment.'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login?mode=signup'); return; }

    const fullName = initialName.trim() || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nett member';
    const profile = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, display_currency: initialCurrency || 'AED' });
    if (profile.error) { setError(profile.error.message); setLoading(false); return; }

    if (!initialWorkspaceId) {
      const existing = await supabase.from('workspaces').select('id').eq('user_id', user.id).eq('archived', false).limit(1).maybeSingle();
      if (!existing.data) {
        const created = await supabase.from('workspaces').insert({ user_id: user.id, name: 'Personal', kind: 'personal', is_default: true });
        if (created.error) { setError(created.error.message); setLoading(false); return; }
      }
    }

    const updated = await supabase.auth.updateUser({ data: { full_name: fullName, nett_onboarding_completed: true } });
    if (updated.error) { setError(updated.error.message); setLoading(false); return; }
    router.replace('/');
    router.refresh();
  }

  return <main className="onboarding-shell">
    <div className="onboarding-glow glow-one" /><div className="onboarding-glow glow-two" />
    <section className="onboarding-card">
      <div className="onboarding-top"><NettLogo priority /><div className="step-count">{step + 1} of {slides.length}</div></div>
      <div className="onboarding-progress" aria-hidden="true"><span style={{ width: `${(step + 1) * 25}%` }} /></div>
      <div className="onboarding-illustration"><Icon size={30} strokeWidth={1.7} /></div>
      <div className="eyebrow"><Sparkles size={14} /> {slide.eyebrow}</div>
      <div className="onboarding-slide"><h1>{slide.title}</h1><p className="auth-copy">{slide.copy}</p></div>
      {error && <div className="form-message" role="alert"><LockKeyhole size={16} /> {error}</div>}
      <div className="onboarding-actions">
        <button type="button" className="onboarding-back" disabled={step === 0 || loading} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /> Back</button>
        {step === slides.length - 1
          ? <button type="button" className="primary-button" disabled={loading} onClick={() => void finish()}>{loading ? <><LoaderCircle size={16} className="spin" /> Opening Nett…</> : <>Get started <ChevronRight size={16} /></>}</button>
          : <button type="button" className="primary-button" onClick={() => setStep((value) => Math.min(slides.length - 1, value + 1))}>Continue <ChevronRight size={16} /></button>}
      </div>
      {step < slides.length - 1 && <button type="button" className="onboarding-skip" disabled={loading} onClick={() => void finish()}>Skip intro</button>}
      <div className="onboarding-note"><LockKeyhole size={15} /> Signed in as {email}. Your data is never shared with another Nett user.</div>
    </section>
  </main>;
}
