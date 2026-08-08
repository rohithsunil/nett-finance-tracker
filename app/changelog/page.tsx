import Link from 'next/link';
import { ArrowLeft, ExternalLink, GitCommitHorizontal, Sparkles } from 'lucide-react';
import { APP_VERSION, CHANGELOG, REPOSITORY_URL } from '@/lib/app-meta';

export default function ChangelogPage() {
  return <main className="changelog-shell">
    <header className="changelog-header">
      <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to Nett</Link>
      <div className="brand-mark">n<span>•</span></div>
      <div className="eyebrow"><Sparkles size={14} /> Product history</div>
      <h1>Release notes.</h1>
      <p>Every meaningful Nett change, in one calm place.</p>
      <div className="release-summary"><strong>Current version {APP_VERSION}</strong><span>·</span><a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub repository <ExternalLink size={13} /></a></div>
    </header>
    <section className="changelog-list" aria-label="Release notes">
      {CHANGELOG.map((entry) => <article className="changelog-entry" key={entry.version}>
        <div className="changelog-entry-top"><div><span className="version-pill">v{entry.version}</span><span className="changelog-date">{entry.date}</span></div><a className="commit-link" href={`${REPOSITORY_URL}/commit/${entry.commit}`} target="_blank" rel="noreferrer"><GitCommitHorizontal size={14} /> {entry.commit} <ExternalLink size={12} /></a></div>
        <h2>{entry.title}</h2>
        <p>{entry.summary}</p>
        <ul>{entry.changes.map((change) => <li key={change}>{change}</li>)}</ul>
      </article>)}
    </section>
    <footer className="changelog-footer">Nett · built for a clearer view of what you have, owe and plan.</footer>
  </main>;
}
