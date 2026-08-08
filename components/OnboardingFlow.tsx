'use client';

import { FormEvent, useState } from 'react';
import { Check, ChevronRight, CircleDollarSign, LoaderCircle, LockKeyhole, Sparkles, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

type Props = { email: string; initialName: string; initialCurrency: string; initialWorkspaceId: string | null };

export default function OnboardingFlow({ email, initialName, initialCurrency, initialWorkspaceId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('current');
  const [balance, setBalance] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function complete(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true); setError('');
    const supabase = getSupabaseBrowser();
    if (!supabase) { setError('Supabase is not configured for this deployment.'); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login?mode=signup'); return; }

    const profileResult = await supabase.from('profiles').upsert({ id: user.id, full_name: name.trim() || user.email?.split('@')[0] || 'Nett member', display_currency: currency }).select('id').single();
    if (profileResult.error) { setError(profileResult.error.message); setLoading(false); return; }

    let workspaceId = initialWorkspaceId;
    if (!workspaceId) {
      const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).eq('is_default', true).eq('archived', false).maybeSingle();
      workspaceId = workspace?.id || null;
    }
    if (!workspaceId) {
      const { data: workspace, error: workspaceError } = await supabase.from('workspaces').insert({ user_id: user.id, name: 'Personal', kind: 'personal', is_default: true }).select('id').single();
      if (workspaceError || !workspace) { setError(workspaceError?.message || 'Could not create your Personal workspace.'); setLoading(false); return; }
      workspaceId = workspace.id;
    }

    if (accountName.trim()) {
      const amount = Number(balance || 0);
      if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid starting balance.'); setLoading(false); return; }
      const { error: accountError } = await supabase.from('accounts').insert({ user_id: user.id, workspace_id: workspaceId, name: accountName.trim(), type: accountType, currency, verified_balance: amount, estimated_balance: amount, balance_verified_at: new Date().toISOString(), include_net_worth: true, include_liquidity: accountType !== 'credit_card' });
      if (accountError) { setError(accountError.message); setLoading(false); return; }
    }

    const { error: userError } = await supabase.auth.updateUser({ data: { full_name: name.trim() || user.email?.split('@')[0] || 'Nett member', nett_onboarding_completed: true } });
    if (userError) { setError(userError.message); setLoading(false); return; }
    router.replace('/');
    router.refresh();
  }

  async function skip() { await complete(); }

  return <main className="onboarding-shell">
    <div className="onboarding-glow glow-one" /><div className="onboarding-glow glow-two" />
    <section className="onboarding-card">
      <div className="onboarding-top"><div className="brand-mark">n<span>•</span></div><div className="step-count">{step} of 2</div></div>
      <div className="onboarding-progress"><span style={{ width: `${step * 50}%` }} /></div>
      <div className="eyebrow"><Sparkles size={14} /> A softer start with money</div>
      {step === 1 ? <>
        <h1>Let’s make Nett yours.</h1>
        <p className="auth-copy">A few details create a useful starting point. You can change everything later.</p>
        <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); setError(''); setStep(2); }}>
          <label>Your name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></label>
          <label>Primary currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="AED">AED · UAE dirham</option><option value="USD">USD · US dollar</option><option value="INR">INR · Indian rupee</option></select></label>
          <div className="onboarding-email"><LockKeyhole size={15} /><span>{email}<small>Your account email</small></span></div>
          <button className="primary-button full">Continue <ChevronRight size={16} /></button>
        </form>
      </> : <>
        <h1>What should we look at first?</h1>
        <p className="auth-copy">Add one real account so your first Nett view has a meaningful starting point. You can add the rest whenever you’re ready.</p>
        <form className="onboarding-form" onSubmit={complete}>
          <label>Account name<input required value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Everyday account" autoComplete="off" /></label>
          <div className="form-grid"><label>Type<select value={accountType} onChange={(event) => setAccountType(event.target.value)}><option value="current">Current account</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="wallet">Wallet</option><option value="credit_card">Credit card</option></select></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="AED">AED</option><option value="USD">USD</option><option value="INR">INR</option></select></label></div>
          <label>Verified balance<input required type="number" min="0" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" inputMode="decimal" /></label>
          {error && <div className="form-message"><CircleDollarSign size={16} /> {error}</div>}
          <button className="primary-button full" disabled={loading}>{loading ? <><LoaderCircle size={16} className="spin" /> Saving your workspace…</> : <><Check size={16} /> Finish setup</>}</button>
        </form>
        <button className="onboarding-skip" disabled={loading} onClick={skip}>I’ll add an account later</button>
        <button className="onboarding-back" disabled={loading} onClick={() => setStep(1)}>Back</button>
      </>}
      <div className="onboarding-note"><Wallet size={15} /> Your numbers stay private and are protected by Supabase row-level security.</div>
    </section>
  </main>;
}
