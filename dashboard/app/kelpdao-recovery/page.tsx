import { Layout } from '@/components/Layout';
import { HeadlinePanel } from '@/components/HeadlinePanel';
import { GovernancePanel } from '@/components/GovernancePanel';
import { ContributionTable } from '@/components/ContributionTable';
import { BridgeConfigPanel } from '@/components/BridgeConfigPanel';
import { BridgeHardeningPanel } from '@/components/BridgeHardeningPanel';
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
  getLatestDvnConfigs,
  getDvnCensusStats,
  type OAppDvnConfig,
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
    tabRaw === 'general'
      ? 'general'
      : tabRaw === 'about'
        ? 'about'
        : tabRaw === 'monitor'
          ? 'monitor'
          : 'arbitrum';

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
      ) : active === 'monitor' ? (
        <MonitorTab />
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
      <BridgeConfigPanel />
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

const DVN_LABELS: Record<string, string> = {
  '0x380275805876ff19055ea900cdb2b46a94ecf20d': 'Horizen Labs',
  '0x589dedbd617e0cbcb916a9223f4d1300c294236b': 'LayerZero Labs',
  '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd': 'Canary',
  '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5': 'Nethermind',
};

const COMPROMISED_DVN = '0x589dedbd617e0cbcb916a9223f4d1300c294236b';

function dvnLabel(addr: string): string {
  return DVN_LABELS[addr.toLowerCase()] ?? `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

async function MonitorTab() {
  const [rows, stats] = await Promise.all([getLatestDvnConfigs(), getDvnCensusStats()]);
  const lastRun = stats.last_run ? new Date(stats.last_run).toISOString().slice(0, 10) : '—';

  return (
    <>
      <div className="mb-6">
        <p className="text-ink-300 text-sm leading-relaxed">
          DVN config changes on LayerZero V2 OApps after the April 18 KelpDAO exploit.
          The headline below is KelpDAO's own hardening — decoded from on-chain{' '}
          <code className="font-mono text-xs text-ink-100">UlnConfigSet</code> events on the
          mainnet ULN302 send library, with pre/post values pulled from{' '}
          <code className="font-mono text-xs text-ink-100">EndpointV2.getConfig()</code> at
          the block before and at the block of each event.
        </p>
        <p className="text-ink-500 text-xs mt-2 leading-relaxed">
          Going forward: a daily cron snapshots configs for every OApp in the watchlist below,
          so any future config change shows up here. Event-driven indexing of{' '}
          <code className="font-mono text-xs text-ink-300">UlnConfigSet</code> across all
          OApps (auto-discovery, full historical coverage) is the next step.
        </p>
      </div>

      <BridgeHardeningPanel />

      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-medium text-ink-100 uppercase tracking-wider">
              Ongoing watchlist
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Latest snapshot per (OApp, route). Daily cron — last run{' '}
              <span className="num-tabular text-ink-300">{lastRun}</span>.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <MonitorCounter label="OApps" value={stats.total_oapps} />
            <MonitorCounter label="Routes" value={stats.total_routes} />
            <MonitorCounter
              label="At 4+ DVNs"
              value={stats.routes_4plus}
              ok={stats.routes_4plus > 0}
            />
          </div>
        </div>
        <WatchlistTable rows={rows} />
      </section>

      <div className="mt-8 text-xs text-ink-500">
        How to extend the watchlist: add an entry to{' '}
        <a
          href="https://github.com/indexing-co/kelpdao-hack-tracker/blob/main/data/oapp-registry.json"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-green hover:opacity-80"
        >
          data/oapp-registry.json
        </a>{' '}
        and run{' '}
        <code className="font-mono text-ink-300">node scripts/run-dvn-census.mjs</code>.
        PRs welcome.
      </div>
    </>
  );
}

function WatchlistTable({ rows }: { rows: OAppDvnConfig[] }) {
  if (rows.length === 0) {
    return (
      <div className="border border-ink-800 rounded-card bg-ink-900 px-6 py-12 text-center text-ink-500 text-sm">
        No watchlist data yet. Run <code className="font-mono">node scripts/run-dvn-census.mjs</code>.
      </div>
    );
  }
  return (
    <div className="border border-ink-800 rounded-card bg-ink-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-xs uppercase tracking-wider text-ink-500">
            <th className="text-left px-4 py-2.5 font-medium">OApp</th>
            <th className="text-left px-4 py-2.5 font-medium">Route</th>
            <th className="text-right px-4 py-2.5 font-medium">DVNs</th>
            <th className="text-right px-4 py-2.5 font-medium">Confirmations</th>
            <th className="text-left px-4 py-2.5 font-medium">DVN set</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOneOfOne = r.required_dvn_count === 1;
            return (
              <tr
                key={`${r.src_chain}-${r.oapp_address}-${r.dst_eid}`}
                className={`border-b border-ink-800 last:border-b-0 ${
                  isOneOfOne ? 'bg-accent-warn/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <a
                    href={`https://etherscan.io/address/${r.oapp_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-green transition-colors"
                  >
                    <div className="font-medium text-ink-100">
                      {r.oapp_name ?? '(unnamed)'}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">{r.protocol ?? ''}</div>
                  </a>
                </td>
                <td className="px-4 py-3 text-xs text-ink-300">
                  {r.src_chain} → {r.dst_chain ?? r.dst_eid}
                </td>
                <td
                  className={`px-4 py-3 text-right num-tabular font-medium ${
                    isOneOfOne
                      ? 'text-accent-warn'
                      : r.required_dvn_count >= 4
                        ? 'text-brand-green'
                        : 'text-ink-100'
                  }`}
                >
                  {r.required_dvn_count}-of-{r.required_dvn_count}
                </td>
                <td className="px-4 py-3 text-right num-tabular text-ink-100">
                  {r.confirmations}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {r.required_dvns.map((d) => (
                      <a
                        key={d}
                        href={`https://etherscan.io/address/${d}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-1.5 py-0.5 rounded font-mono text-xs hover:opacity-80 ${
                          d.toLowerCase() === COMPROMISED_DVN
                            ? 'bg-accent-warn/20 text-accent-warn'
                            : 'bg-ink-800 text-ink-300'
                        }`}
                        title={d}
                      >
                        {dvnLabel(d)}
                      </a>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonitorCounter({
  label,
  value,
  ok,
}: {
  label: string;
  value: number | string;
  ok?: boolean;
}) {
  const accentClass = ok ? 'text-brand-green' : 'text-ink-100';
  return (
    <div className="border border-ink-800 rounded bg-ink-900 px-3 py-2">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`text-base font-medium num-tabular ${accentClass}`}>{value}</div>
    </div>
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

function Counter({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="border border-ink-800 rounded-card bg-ink-900 px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="text-xl font-medium num-tabular">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}
