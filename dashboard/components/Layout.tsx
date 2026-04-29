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
        <div className="flex items-center gap-4">
          <a
            href={INDEXING_CO}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Indexing Co — opens in a new tab"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-ink-100"
          >
            {/* Pixelated bunny mark (2-Bit variant from brandbook) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/indexing-co-bit.svg"
              alt=""
              width={36}
              height={31}
              className="block"
            />
            {/* Wordmark, white fill baked in for dark background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/indexing-co-wordmark-light.svg"
              alt="Indexing Co"
              className="block h-[20px] w-auto"
            />
          </a>
          <span className="text-ink-700">|</span>
          <Link href="/" className="text-sm tracking-wide text-ink-300 hover:text-ink-100 transition-colors">
            observatory
          </Link>
          <span className="text-ink-500">/</span>
          <Link href="/kelpdao-recovery" className="font-medium text-ink-100 hover:opacity-80 transition-opacity">
            kelpdao recovery
          </Link>
        </div>
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
            className="btn-brand px-4 py-1.5"
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
          · Powered by Indexing Co Pipes
        </div>
        <div className="flex items-center gap-4">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-ink-300 hover:text-ink-100">
            Open-source on GitHub
          </a>
          <a
            href={CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-green hover:opacity-80 transition-opacity"
          >
            Want webhooks/alerts on this data? Contact us →
          </a>
        </div>
      </div>
    </footer>
  );
}
