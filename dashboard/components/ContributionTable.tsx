import type { GovernanceProposal } from '@/lib/db';
import { safeExternalUrl } from '@/lib/format';

const STATE_DOT: Record<string, string> = {
  active: 'bg-brand-green',
  pending: 'bg-accent-warn',
  passed: 'bg-brand-green',
  rejected: 'bg-accent-danger',
  executed: 'bg-accent',
  canceled: 'bg-ink-700',
};

const SOURCE_LABEL: Record<string, string> = {
  snapshot: 'Snapshot',
  forum: 'Forum',
  forum_post: 'Forum',
  tweet: 'Tweet',
  site: 'Tracker',
  onchain: 'On-chain',
};

export function ContributionTable({
  proposals,
  ethPriceUsd,
  variant,
  title,
  subtitle,
}: {
  proposals: GovernanceProposal[];
  ethPriceUsd: number;
  variant: 'backing' | 'liquidity';
  title: string;
  subtitle?: string;
}) {
  if (proposals.length === 0) {
    return (
      <section className="mt-6">
        <h3 className="text-sm font-medium text-ink-300 mb-2">{title}</h3>
        <div className="border border-ink-800 rounded-card bg-ink-900 px-4 py-6 text-center text-ink-500 text-sm">
          No entries yet.
        </div>
      </section>
    );
  }

  // Sort by USD-equivalent value desc (using ETH price for ETH-denominated)
  const sorted = [...proposals].sort((a, b) => {
    const aUsd = computeUsd(a, ethPriceUsd);
    const bUsd = computeUsd(b, ethPriceUsd);
    return bUsd - aUsd;
  });

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-ink-100">{title}</h3>
          {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-xs text-ink-500 num-tabular">{sorted.length} contributors</div>
      </div>
      <div className="border border-ink-800 rounded-card bg-ink-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-xs uppercase tracking-wider text-ink-500">
              <th className="text-left px-4 py-2.5 font-medium">Contributor</th>
              <th className="text-right px-4 py-2.5 font-medium">Amount</th>
              <th className="text-right px-4 py-2.5 font-medium">USD</th>
              <th className="text-right px-4 py-2.5 font-medium">ETH</th>
              <th className="text-left px-4 py-2.5 font-medium pl-6">Source</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const eth = p.amount_eth ? Number(p.amount_eth) : null;
              const usd = p.amount_usd ? Number(p.amount_usd) : null;
              const usdValue = computeUsd(p, ethPriceUsd);
              const ethValue = computeEth(p, ethPriceUsd);
              const proposalUrl = safeExternalUrl(p.url);
              return (
                <tr key={p.id} className="border-b border-ink-800 last:border-b-0 hover:bg-ink-950/50">
                  <td className="px-4 py-3">
                    {proposalUrl ? (
                      <a
                        href={proposalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-green transition-colors"
                      >
                        <ContributorLabel proposal={p} />
                      </a>
                    ) : (
                      <ContributorLabel proposal={p} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right num-tabular">
                    {eth !== null ? (
                      <span className="text-ink-100">
                        {eth.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                        <span className="text-ink-500 text-xs">ETH</span>
                      </span>
                    ) : usd !== null ? (
                      <span className="text-ink-100">
                        ${(usd / 1_000_000).toFixed(usd >= 10_000_000 ? 0 : 1)}M{' '}
                        <span className="text-ink-500 text-xs">USD</span>
                      </span>
                    ) : (
                      <span className="text-ink-500 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-300 text-xs num-tabular">
                    {usdValue > 0 ? `$${formatUsdShort(usdValue)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-300 text-xs num-tabular">
                    {ethValue > 0 ? `${ethValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="px-4 py-3 pl-6 text-xs">
                    {proposalUrl ? (
                      <a
                        href={proposalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-green hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                        title={proposalUrl}
                      >
                        {SOURCE_LABEL[p.source] ?? p.source}
                        <span className="text-ink-500" aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="text-ink-300">{SOURCE_LABEL[p.source] ?? p.source}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${STATE_DOT[p.state] ?? 'bg-ink-500'}`}
                      />
                      <span className="text-xs text-ink-300">{p.state}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-ink-800 bg-ink-950/50 font-medium">
              <td className="px-4 py-3 text-xs uppercase tracking-wider text-ink-500">Total</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-ink-100 num-tabular">
                ${formatUsdShort(sorted.reduce((s, p) => s + computeUsd(p, ethPriceUsd), 0))}
              </td>
              <td className="px-4 py-3 text-right text-ink-100 num-tabular">
                {sorted
                  .reduce((s, p) => s + computeEth(p, ethPriceUsd), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function ContributorLabel({ proposal }: { proposal: GovernanceProposal }) {
  return (
    <>
      <div className="font-medium text-ink-100">{proposal.proposer ?? 'Unknown'}</div>
      <div className="text-xs text-ink-500 mt-0.5 truncate max-w-xs">{proposal.title}</div>
    </>
  );
}

function computeUsd(p: GovernanceProposal, ethPriceUsd: number): number {
  if (p.amount_usd) return Number(p.amount_usd);
  if (p.amount_eth) return Number(p.amount_eth) * ethPriceUsd;
  return 0;
}

function computeEth(p: GovernanceProposal, ethPriceUsd: number): number {
  if (p.amount_eth) return Number(p.amount_eth);
  if (p.amount_usd && ethPriceUsd > 0) return Number(p.amount_usd) / ethPriceUsd;
  return 0;
}

function formatUsdShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
