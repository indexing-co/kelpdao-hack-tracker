import Link from 'next/link';
import { ReactNode } from 'react';

const REPO = 'https://github.com/indexing-co/kelpdao-hack-tracker';
const CONTACT = 'https://indexing.co/contact';
const INDEXING_CO = 'https://indexing.co';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-ink-800 bg-ink-950">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-sm tracking-wide text-ink-300">indexing.co</span>
          <span className="text-ink-500">/</span>
          <span className="font-medium">observatory · kelpdao recovery</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-300 hover:text-ink-100"
          >
            ↗ github
          </a>
          <a
            href={CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-accent text-ink-950 font-medium hover:bg-cyan-300 transition-colors"
          >
            Want this for your protocol? →
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-800 bg-ink-950 mt-12">
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm flex flex-wrap items-center justify-between gap-3">
        <div className="text-ink-500">
          Built by{' '}
          <a href={INDEXING_CO} className="text-ink-300 hover:text-ink-100">
            Indexing Co
          </a>{' '}
          · Powered by Indexing Co Pipes + Neon Postgres
        </div>
        <div className="flex items-center gap-4">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-ink-300 hover:text-ink-100">
            Open-source on GitHub
          </a>
          <a
            href={CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-cyan-300"
          >
            Want webhooks/alerts on this data? Contact us →
          </a>
        </div>
      </div>
    </footer>
  );
}
