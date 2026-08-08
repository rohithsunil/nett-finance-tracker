'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, LockKeyhole, Sparkles } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import NettLogo from '@/components/NettLogo';

type AuthMode = 'login' | 'signup' | 'reset';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('mode');
    if (requested === 'signup' || requested === 'reset') setMode(requested);

    const verified = params.get('verified');
    if (verified === '1') {
      setMode('login');
      setMessage('Email verified. You can now sign in to Nett.');
    } else if (verified === 'error') {
      setMode('login');
      setMessage('That confirmation link has expired or was already used. Request a new one if needed.');
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage('');
    const supabase = getSupabaseBrowser();
    if (!supabase) { setMessage('Add Supabase variables to .env.local to enable accounts.'); setLoading(false); return; }

    if (mode === 'reset') {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
      if (result.error) setMessage(result.error.message);
      else setMessage('Check your email for a secure password reset link.');
      setLoading(false);
      return;
    }

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (result.error) setMessage(result.error.message);
    else if (mode === 'signup' && !result.data.session) setMessage('Account created. Check your email to confirm Nett, then return here to sign in.');
    else if (mode === 'signup') window.location.href = '/onboarding';
    else window.location.href = '/';
    setLoading(false);
  }

  const reset = () => { setMode('reset'); setMessage(''); };
  const switchMode = () => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); };

  return <main className="auth-shell">
    <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
    <div className="auth-card">
      <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to Nett</Link>
      <NettLogo large priority />
      <div className="eyebrow"><Sparkles size={14} /> Your calm financial cockpit</div>
      <h1>{mode === 'login' ? 'Welcome back.' : mode === 'signup' ? 'Make money feel lighter.' : 'A fresh start.'}</h1>
      <p className="auth-copy">{mode === 'login' ? 'Pick up where your last check-in left off.' : mode === 'signup' ? 'Start with one private place for everything you have, owe and plan.' : 'We’ll send a secure link to reset your Nett password.'}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && <label>Your name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></label>}
        <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        {mode !== 'reset' && <label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
        <button className="primary-button full" disabled={loading}>{loading ? 'Working…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create private account' : 'Send reset link'}</button>
      </form>
      {message && <div className="form-message"><Check size={16} /> {message}</div>}
      {mode === 'login' && <button className="switch-auth subtle" onClick={reset}>Forgot your password?</button>}
      {mode !== 'reset' && <button className="switch-auth" onClick={switchMode}>{mode === 'login' ? 'New to Nett? Create an account' : 'Already have an account? Sign in'}</button>}
      {mode === 'reset' && <button className="switch-auth" onClick={() => { setMode('login'); setMessage(''); }}>Back to sign in</button>}
      <div className="security-note"><LockKeyhole size={15} /> Your data is isolated with database-level security.</div>
    </div>
  </main>;
}
