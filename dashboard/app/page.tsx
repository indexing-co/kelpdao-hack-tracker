import Link from 'next/link';
import { Layout } from '@/components/Layout';

export const metadata = {
  title: 'Indexing Co Observatory — public dashboards on DeFi recovery and on-chain forensics',
};

const TRACKERS = [
  {
    slug: 'kelpdao-recovery',
    title: 'KelpDAO recovery',
    blurb:
      "Live tracker of the 30,765.67 ETH frozen on Arbitrum after the April 2026 KelpDAO bridge exploit, the cross-DAO DeFi United recovery flow, and a DVN config monitor showing how Kelp hardened their bridge 5 days post-hack.",
    status: 'active',
  },
];

export default function HubPage() {
  return (
    <Layout>
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold mb-3 text-ink-100 leading-tight">
          Couple the news with what's actually on-chain.
        </h1>
        <p className="text-ink-300 leading-relaxed">
          Public dashboards that pair news headlines with primary on-chain data.
          Built and maintained by{' '}
          <a
            href="https://indexing.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-green hover:opacity-80 transition-opacity"
          >
            Indexing Co
          </a>
          . Open source. Designed so builders and researchers can fork them and
          run their own version.
        </p>
      </div>

      <h2 className="text-sm font-medium text-ink-500 uppercase tracking-widest mb-3">
        Live trackers
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {TRACKERS.map((t) => (
          <Link
            key={t.slug}
            href={`/${t.slug}`}
            className="block border border-ink-800 rounded-card bg-ink-900 p-6 hover:border-brand-green hover:bg-ink-900/80 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-ink-100">{t.title}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-green/20 text-brand-green">
                {t.status}
              </span>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed">{t.blurb}</p>
            <div className="mt-3 text-xs text-brand-green">Open tracker →</div>
          </Link>
        ))}
      </div>

      <div className="border border-ink-800 rounded-card bg-ink-900 p-6 text-center">
        <div className="text-sm text-ink-300 mb-3">
          Want a tracker like this for your protocol?
        </div>
        <a
          href="https://indexing.co/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand inline-block px-6 py-2.5"
        >
          Contact us →
        </a>
      </div>
    </Layout>
  );
}
