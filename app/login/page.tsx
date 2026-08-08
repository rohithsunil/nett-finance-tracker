'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, LockKeyhole, Sparkles } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage('');
    const supabase = getSupabaseBrowser();
    if (!supabase) { setMessage('Add Supabase variables to .env.local to enable accounts.'); setLoading(false); return; }
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (result.error) setMessage(result.error.message);
    else if (mode === 'signup') setMessage('Account created. Check your email to confirm Nett.');
    else window.location.href = '/';
    setLoading(false);
  }

  return <main className="auth-shell">
    <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
    <div className="auth-card">
      <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to Nett</Link>
      <div className="brand-mark large">n<span>•</span></div>
      <div className="eyebrow"><Sparkles size={14} /> Your calm financial cockpit</div>
      <h1>{mode === 'login' ? 'Welcome back.' : 'Make money feel lighter.'}</h1>
      <p className="auth-copy">{mode === 'login' ? 'Pick up where your last check-in left off.' : 'Start with one private place for everything you have, owe and plan.'}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && <label>Your name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Rohith" /></label>}
        <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
        <button className="primary-button full" disabled={loading}>{loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create private account'}</button>
      </form>
      {message && <div className="form-message"><Check size={16} /> {message}</div>}
      <button className="switch-auth" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? 'New to Nett? Create an account' : 'Already have an account? Sign in'}</button>
      <div className="security-note"><LockKeyhole size={15} /> Your data is isolated with database-level security.</div>
    </div>
  </main>;
}
