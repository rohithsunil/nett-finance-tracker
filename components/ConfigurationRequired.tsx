import Link from 'next/link';
import { CircleAlert, Settings2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/app-meta';
import NettLogo from '@/components/NettLogo';

export default function ConfigurationRequired() {
  return <main className="auth-shell">
    <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
    <section className="auth-card config-card">
      <NettLogo large priority />
      <div className="eyebrow"><Settings2 size={14} /> Nett needs one last connection</div>
      <h1>Connect your workspace.</h1>
      <p className="auth-copy">This deployment is missing its Supabase public environment variables. Add them in Vercel, then redeploy so accounts and private data can work.</p>
      <div className="form-message"><CircleAlert size={16} /> <span>Required: <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.</span></div>
      <Link href="/changelog" className="primary-button full">View release notes</Link>
      <div className="security-note">Nett {APP_VERSION} · no demo data is shown in production mode.</div>
    </section>
  </main>;
}
