import Link from 'next/link';

export type TabKey = 'arbitrum' | 'general' | 'monitor' | 'about';

const TABS: Array<{ key: TabKey; label: string; sublabel: string }> = [
  { key: 'arbitrum', label: 'Arbitrum freeze', sublabel: 'on-chain freeze, AIP, freeze action' },
  { key: 'general', label: 'Recovery', sublabel: 'cross-DAO commitments + tweets' },
  { key: 'monitor', label: 'DVN monitor', sublabel: 'config changes since the hack' },
  { key: 'about', label: 'About', sublabel: 'why this dashboard exists' },
];

export function Tabs({ active }: { active: TabKey }) {
  return (
    <div className="border-b border-ink-800 mb-8">
      <nav className="flex gap-8 -mb-px" aria-label="Sections">
        {TABS.map((t) => {
          const isActive = t.key === active;
          const href =
            t.key === 'arbitrum'
              ? '/kelpdao-recovery'
              : `/kelpdao-recovery?tab=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={
                'pb-3 pt-1 px-1 border-b-2 transition-colors ' +
                (isActive
                  ? 'border-brand-green text-ink-100'
                  : 'border-transparent text-ink-500 hover:text-ink-300')
              }
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`text-sm font-medium ${isActive ? 'text-ink-100' : ''}`}>
                {t.label}
              </div>
              <div className="text-xs text-ink-500 mt-0.5">{t.sublabel}</div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
