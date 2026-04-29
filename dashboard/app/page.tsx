import { Layout } from '@/components/Layout';
import { HeadlinePanel } from '@/components/HeadlinePanel';
import { GovernancePanel } from '@/components/GovernancePanel';
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
  const [proposals, counts, pool] = await Promise.all([
    getGovernanceProposalsByCategory('recovery'),
    getTableCounts(),
    getRecoveryPoolStats(),
  ]);

  const backing = Number(pool.backing_eth);
  const liquidity = Number(pool.liquidity_eth);
  const aip = Number(pool.aip_eth);
  const gap = Number(pool.gap_eth);
  const backingPct = gap > 0 ? Math.round((backing / gap) * 100) : 0;
  const totalIfAipPasses = backing + aip;
  const totalIfAipPassesPct = gap > 0 ? Math.round((totalIfAipPasses / gap) * 100) : 0;

  return (
    <>
      <section className="border border-ink-800 rounded-card bg-ink-900 p-8 mb-6">
        <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">
          rsETH backing pledges
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="text-4xl font-semibold num-tabular">
            {backing.toLocaleString()} ETH
          </div>
          <div className="text-ink-500 text-lg">/ {gap.toLocaleString()} ETH gap</div>
          <div className="ml-auto px-3 py-1 rounded text-xs font-medium bg-brand-green/20 text-brand-green">
            {backingPct}% pledged
          </div>
        </div>
        <div className="text-sm text-ink-300 mt-3">
          Direct ETH commitments to restore rsETH backing. Counts donations + the Mantle
          MIP-34 credit facility. Excludes market-liquidity backstops (LayerZero's second 5K,
          $20M TRON/HTX USDT, etc.) which are tracked separately.
        </div>
        <div className="mt-3 pt-3 border-t border-ink-800 text-xs text-ink-500 num-tabular">
          + {aip.toLocaleString()} ETH from the Arbitrum Constitutional AIP if the May 12-26
          vote passes ({totalIfAipPasses.toLocaleString()} ETH total — {totalIfAipPassesPct}% of gap)
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Counter label="backing pledges" value={pool.backing_contributors} sub={`${backing.toLocaleString()} ETH`} />
        <Counter label="liquidity backstops" value={pool.liquidity_contributors} sub={liquidity > 0 ? `+${liquidity.toLocaleString()} ETH` : 'USD-denominated'} />
        <Counter label="info entries" value={counts.recovery_proposals - pool.backing_contributors - pool.liquidity_contributors} sub="no quantified pledge" />
        <Counter label="arbitrum AIP" value={aip > 0 ? aip.toLocaleString() : '—'} sub="ETH (if vote passes)" />
      </div>

      <GovernancePanel
        proposals={proposals}
        title="Recovery commitments"
        subtitle="Cross-DAO pledges via tweet, forum post, and Snapshot proposal. Filtered into rsETH backing vs market liquidity."
      />
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
