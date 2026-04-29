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
  const active: TabKey = tabRaw === 'general' ? 'general' : 'arbitrum';

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">KelpDAO Recovery — Live Tracker</h1>
        <p className="text-ink-500 text-sm">
          On-chain status of the 30,765.67 ETH frozen on Arbitrum One after the
          April 2026 KelpDAO exploit, plus the cross-DAO recovery flow.
          All data via Indexing Co pipelines into Neon Postgres.
        </p>
      </div>

      <Tabs active={active} />

      {active === 'arbitrum' ? <ArbitrumTab /> : <GeneralTab />}

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

function Counter({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="border border-ink-800 rounded-card bg-ink-900 px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="text-xl font-medium num-tabular">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}
