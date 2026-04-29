import { Layout } from '@/components/Layout';
import { HeadlinePanel } from '@/components/HeadlinePanel';
import { GovernancePanel } from '@/components/GovernancePanel';
import { ContributionTable } from '@/components/ContributionTable';
import { Tabs, type TabKey } from '@/components/Tabs';
import {
  WalletFlowsTable,
  MultisigEventsTable,
  FreezeEventsTable,
} from '@/components/EventTables';
import {
  getFrozenWalletStatus,
  getRecentWalletFlows,
  getRecentMultisigEvents,
  getRecentFreezeActionEvents,
  getGovernanceProposalsByCategory,
  getTableCounts,
  getRecoveryPoolStats,
  getEthPriceUsd,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabRaw = params.tab;
  const active: TabKey =
    tabRaw === 'general' ? 'general' : tabRaw === 'about' ? 'about' : 'arbitrum';

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">KelpDAO Recovery — Live Tracker</h1>
        <p className="text-ink-500 text-sm">
          On-chain status of the 30,765.67 ETH frozen on Arbitrum One after the
          April 2026 KelpDAO exploit, plus the cross-DAO recovery flow.
          All data via Indexing Co pipelines.
        </p>
      </div>

      <Tabs active={active} />

      {active === 'arbitrum' ? (
        <ArbitrumTab />
      ) : active === 'general' ? (
        <GeneralTab />
      ) : (
        <AboutTab />
      )}

      <div className="mt-12 p-6 border border-ink-800 rounded-card bg-ink-900 text-center">
        <div className="text-sm text-ink-300 mb-3">
          Want webhooks/alerts on this data, or a similar tracker for your protocol?
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

async function ArbitrumTab() {
  const [status, flows, multisig, freezeActions, proposals, counts] = await Promise.all([
    getFrozenWalletStatus(),
    getRecentWalletFlows(50),
    getRecentMultisigEvents(50),
    getRecentFreezeActionEvents(25),
    getGovernanceProposalsByCategory('arbitrum'),
    getTableCounts(),
  ]);

  return (
    <>
      <HeadlinePanel
        current_balance_wei={status.current_balance_wei}
        total_inflows_wei={status.total_inflows_wei}
        total_outflows_wei={status.total_outflows_wei}
        last_movement={status.last_movement}
      />

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Counter label="wallet_flows" value={counts.wallet_flows} />
        <Counter label="multisig_events" value={counts.multisig_events} />
        <Counter
          label="freeze_actions"
          value={counts.freeze_actions}
          sub={`of ${counts.l1_messaging_events.toLocaleString()} L1 messaging events`}
        />
        <Counter label="arbitrum_proposals" value={counts.arbitrum_proposals} />
      </div>

      <GovernancePanel proposals={proposals} title="Arbitrum governance" subtitle="Constitutional AIPs and on-chain governor proposals tied to the freeze and release" />
      <WalletFlowsTable rows={flows} />
      <MultisigEventsTable rows={multisig} />
      <FreezeEventsTable
        rows={freezeActions}
        title="Freeze action events"
        subtitle="Filtered to Inbox.Upgraded + Upgrade Executor events. Routine MessageDelivered traffic (~1.3k rows in raw table) is excluded."
      />
    </>
  );
}

async function GeneralTab() {
  const [proposals, pool, ethPrice] = await Promise.all([
    getGovernanceProposalsByCategory('recovery'),
    getRecoveryPoolStats(),
    getEthPriceUsd(),
  ]);

  const backingProposals = proposals.filter((p) => p.commitment_type === 'backing');
  const liquidityProposals = proposals.filter((p) => p.commitment_type === 'liquidity');
  const infoProposals = proposals.filter((p) => p.commitment_type === 'info');

  const backing = Number(pool.backing_eth);
  const liquidityEth = Number(pool.liquidity_eth);
  const liquidityUsd = Number(pool.liquidity_usd);
  const aip = Number(pool.aip_eth);
  const gap = Number(pool.gap_eth);
  const backingPct = gap > 0 ? Math.round((backing / gap) * 100) : 0;
  const totalIfAipPasses = backing + aip;
  const totalIfAipPassesPct = gap > 0 ? Math.round((totalIfAipPasses / gap) * 100) : 0;

  return (
    <>
      <div className="text-xs text-ink-500 mb-3">
        Total ETH-to-recover figure (~89.5K ETH gap) sourced from{' '}
        <a
          href="https://www.chainalysis.com/blog/kelpdao-bridge-exploit-april-2026/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-green hover:opacity-80 transition-opacity"
        >
          Chainalysis: Inside the KelpDAO Bridge Exploit ↗
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Backing panel */}
        <section className="border border-ink-800 rounded-card bg-ink-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-ink-500">
              rsETH backing
            </div>
            <div className="px-2 py-0.5 rounded text-xs font-medium bg-brand-green/20 text-brand-green">
              {backingPct}% pledged
            </div>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-3xl font-semibold num-tabular text-ink-100">
              {backing.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-ink-300 text-base">ETH</div>
            <div className="text-ink-500 text-sm">/ {gap.toLocaleString()} gap</div>
          </div>
          <div className="text-xs text-ink-500 mt-2 num-tabular">
            {pool.backing_contributors} contributors · donations + Mantle credit facility
          </div>
          <div className="mt-4 pt-3 border-t border-ink-800 text-xs text-ink-500 num-tabular">
            + {aip.toLocaleString()} ETH from Arbitrum AIP if vote passes ({totalIfAipPassesPct}% of gap)
          </div>
        </section>

        {/* Liquidity panel */}
        <section className="border border-ink-800 rounded-card bg-ink-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-ink-500">
              Market liquidity backstops
            </div>
            <div className="px-2 py-0.5 rounded text-xs font-medium bg-brand-pink/20 text-brand-pink">
              separate bucket
            </div>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-3xl font-semibold num-tabular text-ink-100">
              ${(liquidityUsd / 1_000_000).toFixed(0)}M
            </div>
            <div className="text-ink-300 text-base">USD</div>
            {liquidityEth > 0 && (
              <div className="text-ink-500 text-sm">+ {liquidityEth.toLocaleString()} ETH</div>
            )}
          </div>
          <div className="text-xs text-ink-500 mt-2 num-tabular">
            {pool.liquidity_contributors} contributors · TRON+HTX, Renzo, Babylon, Solana, etc.
          </div>
          <div className="mt-4 pt-3 border-t border-ink-800 text-xs text-ink-500">
            Stablecoins + market support to absorb Aave bad debt. Does NOT close the rsETH backing gap.
          </div>
        </section>
      </div>

      <div className="text-xs text-ink-500 num-tabular mb-2">
        ETH price reference: ${ethPrice.toLocaleString()} (CoinGecko, cached 10 min)
      </div>

      <ContributionTable
        proposals={backingProposals}
        ethPriceUsd={ethPrice}
        variant="backing"
        title="rsETH backing pledges"
        subtitle="Direct ETH commitments. Counts donations + Mantle credit facility. Closes the 89,500 ETH gap."
      />

      <ContributionTable
        proposals={liquidityProposals}
        ethPriceUsd={ethPrice}
        variant="liquidity"
        title="Market liquidity backstops"
        subtitle="Stablecoin and market support to absorb Aave bad debt. Does NOT close the rsETH backing gap."
      />

      {infoProposals.length > 0 && (
        <GovernancePanel
          proposals={infoProposals}
          title="Other recovery references"
          subtitle="Coordination posts, official sites, and pledges without quantified amounts"
        />
      )}
    </>
  );
}

function AboutTab() {
  return (
    <>
      <section className="border border-ink-800 rounded-card bg-ink-900 p-8 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-ink-100 leading-tight">
          Couple the news with what's actually on-chain.
        </h2>
        <p className="text-ink-300 leading-relaxed mb-3">
          The KelpDAO recovery is unfolding across many surfaces. Tweets,
          governance forums, multisig signatures, ETH moving across L2s, AIPs
          stacking up. The narrative is fragmented across X, Discord, Snapshot
          and a handful of news outlets.
        </p>
        <p className="text-ink-300 leading-relaxed mb-3">
          This dashboard exists so anyone can pair a tweet or headline with the
          actual on-chain state. Every number you see traces back to a transaction
          hash, a forum thread, or a primary-source post. No press releases.
        </p>
        <p className="text-ink-300 leading-relaxed">
          Built as a public utility by{' '}
          <a
            href="https://indexing.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-green hover:opacity-80 transition-opacity"
          >
            Indexing Co
          </a>
          . Open source. Forkable. Designed so builders and researchers can run
          their own version against their own database.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <section className="border border-ink-800 rounded-card bg-ink-900 p-6">
          <h3 className="text-sm font-medium text-ink-100 mb-3 uppercase tracking-wider">
            What's tracked
          </h3>
          <ul className="space-y-2 text-sm text-ink-300">
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>The Arbitrum freeze: 30,766 ETH locked at <code className="text-xs font-mono text-ink-100">0x...0DA0</code> + the L1 Inbox upgrade tx that put it there</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Recovery commitments: every public ETH pledge to DeFi United, split between rsETH backing and market liquidity</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Governance flow: Constitutional AIP, Snapshot proposals, forum posts, and on-chain governor events when they fire</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Real-time wallet flows on the watched cohort (the frozen wallet, the recovery Safe, the rsETH OFT lockbox)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Security Council multisig events on Ethereum L1</span>
            </li>
          </ul>
        </section>

        <section className="border border-ink-800 rounded-card bg-ink-900 p-6">
          <h3 className="text-sm font-medium text-ink-100 mb-3 uppercase tracking-wider">
            For builders + researchers
          </h3>
          <p className="text-sm text-ink-300 mb-3 leading-relaxed">
            Every pipeline that powers this dashboard is open source. Fork the
            repo, point it at your own database, run your own version. The
            patterns generalise to any cross-chain forensics or governance
            tracking.
          </p>
          <ul className="space-y-2 text-sm text-ink-300 mb-4">
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>3 live Indexing Co pipes (wallet flows, multisig, freeze events) writing to Postgres</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Snapshot poller running on a GitHub Actions cron (every 15 min)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Verified address registry with a deployment guard (no fabricated addresses ship to the live pipeline)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-green shrink-0">→</span>
              <span>Per-pipe READMEs with deploy + backfill recipes</span>
            </li>
          </ul>
          <a
            href="https://github.com/indexing-co/kelpdao-hack-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-brand-green text-sm font-medium hover:opacity-80 transition-opacity"
          >
            github.com/indexing-co/kelpdao-hack-tracker ↗
          </a>
        </section>
      </div>

      <section className="border border-ink-800 rounded-card bg-ink-900 p-6 mb-6">
        <h3 className="text-sm font-medium text-ink-100 mb-3 uppercase tracking-wider">
          Primary sources we lean on
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <SourceLink
            label="Chainalysis: Inside the KelpDAO Bridge Exploit"
            url="https://www.chainalysis.com/blog/kelpdao-bridge-exploit-april-2026/"
          />
          <SourceLink
            label="LayerZero: KelpDAO Incident Statement"
            url="https://layerzero.network/blog/kelpdao-incident-statement"
          />
          <SourceLink
            label="Arbitrum Foundation: Security Council Emergency Action"
            url="https://forum.arbitrum.foundation/t/security-council-emergency-action-21-04-2026/30803"
          />
          <SourceLink
            label="Arbitrum Constitutional AIP (release of frozen ETH)"
            url="https://forum.arbitrum.foundation/t/constitutional-aip-approve-release-of-frozen-eth/30825"
          />
          <SourceLink
            label="Aave gov: rsETH incident report"
            url="https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580"
          />
          <SourceLink label="DeFi United live tracker" url="https://defiunited.fyi/" />
        </div>
      </section>

      <section className="border border-ink-800 rounded-card bg-ink-900 p-6 mb-6">
        <h3 className="text-sm font-medium text-ink-100 mb-3 uppercase tracking-wider">
          What's not tracked yet
        </h3>
        <ul className="space-y-2 text-sm text-ink-500">
          <li>Cross-chain laundering trail (Tornado Cash, THORChain, Umbra hops)</li>
          <li>Aave V3/V4 attacker positions (per-position health, liquidation status)</li>
          <li>Compound positions (similar)</li>
          <li>Other affected protocols beyond Aave + Compound</li>
        </ul>
      </section>
    </>
  );
}

function SourceLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink-300 hover:text-brand-green transition-colors flex items-center gap-1"
    >
      <span className="text-brand-green text-xs">↗</span>
      <span className="truncate">{label}</span>
    </a>
  );
}

function Counter({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="border border-ink-800 rounded-card bg-ink-900 px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="text-xl font-medium num-tabular">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}
