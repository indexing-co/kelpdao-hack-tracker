import { Layout } from '@/components/Layout';
import { HeadlinePanel } from '@/components/HeadlinePanel';
import { GovernancePanel } from '@/components/GovernancePanel';
import {
  WalletFlowsTable,
  MultisigEventsTable,
  FreezeEventsTable,
} from '@/components/EventTables';
import {
  getFrozenWalletStatus,
  getRecentWalletFlows,
  getRecentMultisigEvents,
  getRecentFreezeEvents,
  getGovernanceProposals,
  getTableCounts,
} from '@/lib/db';

// Always render fresh — keep this on the server, no caching.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const [status, flows, multisig, freeze, proposals, counts] = await Promise.all([
    getFrozenWalletStatus(),
    getRecentWalletFlows(50),
    getRecentMultisigEvents(50),
    getRecentFreezeEvents(50),
    getGovernanceProposals(),
    getTableCounts(),
  ]);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">KelpDAO Recovery — Live Tracker</h1>
        <p className="text-ink-500 text-sm">
          On-chain status of the 30,765.67 ETH frozen on Arbitrum One after the
          April 2026 KelpDAO exploit, plus the L1 Security Council emergency action that
          froze it. All data via Indexing Co pipelines into Neon Postgres.
        </p>
      </div>

      <HeadlinePanel
        current_balance_wei={status.current_balance_wei}
        total_inflows_wei={status.total_inflows_wei}
        total_outflows_wei={status.total_outflows_wei}
        last_movement={status.last_movement}
      />

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Counter label="wallet_flows" value={counts.wallet_flows} />
        <Counter label="multisig_events" value={counts.multisig_events} />
        <Counter label="freeze_events" value={counts.arbitrum_freeze_events} />
        <Counter label="governance_proposals" value={counts.governance_proposals} />
      </div>

      <GovernancePanel proposals={proposals} />
      <WalletFlowsTable rows={flows} />
      <MultisigEventsTable rows={multisig} />
      <FreezeEventsTable rows={freeze} />

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

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink-800 rounded-lg bg-ink-900 px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="text-xl font-medium num-tabular">{value}</div>
    </div>
  );
}
