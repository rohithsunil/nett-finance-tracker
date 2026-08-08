'use client';

import { FormEvent, useState } from 'react';
import { Check, LockKeyhole, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import NettLogo from '@/components/NettLogo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) { setError('Supabase is not configured for this deployment.'); setLoading(false); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    router.replace('/');
    router.refresh();
  }

  return <main className="auth-shell"><div className="auth-orb orb-one" /><div className="auth-orb orb-two" /><div className="auth-card"><NettLogo large priority /><div className="eyebrow"><Sparkles size={14} /> Secure account recovery</div><h1>Choose a new password.</h1><p className="auth-copy">Use at least eight characters, then you’ll return to your private Nett workspace.</p><form onSubmit={submit} className="auth-form"><label>New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></label><label>Confirm password<input required minLength={8} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" placeholder="Repeat your password" /></label>{error && <div className="form-message"><Check size={16} /> {error}</div>}<button className="primary-button full" disabled={loading}>{loading ? 'Saving…' : 'Save new password'}</button></form><div className="security-note"><LockKeyhole size={15} /> Password recovery is handled by Supabase Auth.</div></div></main>;
}
