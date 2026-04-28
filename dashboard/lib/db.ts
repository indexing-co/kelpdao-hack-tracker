import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in the Neon connection string.',
    );
  }
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return global.__pgPool;
}

export async function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

// ============================================================================
// Typed query helpers
// ============================================================================

export interface WalletFlow {
  chain: string;
  block: string; // BIGINT comes back as string
  block_timestamp: string;
  transaction_hash: string;
  log_index: number;
  from_address: string;
  to_address: string;
  token_address: string | null;
  amount_wei: string;
  direction: 'in' | 'out';
  watched_address: string;
  is_headline: boolean;
  created_at: string;
}

export interface MultisigEvent {
  chain: string;
  block: string;
  block_timestamp: string;
  transaction_hash: string;
  log_index: number;
  contract_address: string;
  event_name: string;
  decoded: Record<string, unknown>;
  created_at: string;
}

export interface FreezeEvent {
  chain: string;
  block: string;
  block_timestamp: string;
  transaction_hash: string;
  log_index: number;
  contract_address: string;
  contract_label: string;
  event_name: string;
  decoded: Record<string, unknown>;
  created_at: string;
}

const FROZEN_WALLET = '0x0000000000000000000000000000000000000da0';

export async function getFrozenWalletStatus(): Promise<{
  current_balance_wei: string;
  last_movement: WalletFlow | null;
  total_inflows_wei: string;
  total_outflows_wei: string;
}> {
  const flows = await query<WalletFlow>(
    `SELECT * FROM wallet_flows
     WHERE watched_address = $1
     ORDER BY block DESC, log_index DESC`,
    [FROZEN_WALLET],
  );

  let inflows = 0n;
  let outflows = 0n;
  for (const f of flows) {
    if (f.direction === 'in') inflows += BigInt(f.amount_wei);
    else outflows += BigInt(f.amount_wei);
  }

  return {
    current_balance_wei: (inflows - outflows).toString(),
    last_movement: flows[0] ?? null,
    total_inflows_wei: inflows.toString(),
    total_outflows_wei: outflows.toString(),
  };
}

export async function getRecentWalletFlows(limit = 25): Promise<WalletFlow[]> {
  return query<WalletFlow>(
    `SELECT * FROM wallet_flows ORDER BY block DESC, log_index DESC LIMIT $1`,
    [limit],
  );
}

export async function getRecentMultisigEvents(limit = 25): Promise<MultisigEvent[]> {
  return query<MultisigEvent>(
    `SELECT * FROM multisig_events ORDER BY block DESC, log_index DESC LIMIT $1`,
    [limit],
  );
}

export async function getRecentFreezeEvents(limit = 25): Promise<FreezeEvent[]> {
  return query<FreezeEvent>(
    `SELECT * FROM arbitrum_freeze_events ORDER BY block DESC, log_index DESC LIMIT $1`,
    [limit],
  );
}

export async function getTableCounts(): Promise<{
  wallet_flows: number;
  multisig_events: number;
  arbitrum_freeze_events: number;
  governance_proposals: number;
}> {
  const rows = await query<{ table: string; count: string }>(
    `SELECT 'wallet_flows' AS table, COUNT(*)::text AS count FROM wallet_flows
     UNION ALL
     SELECT 'multisig_events', COUNT(*)::text FROM multisig_events
     UNION ALL
     SELECT 'arbitrum_freeze_events', COUNT(*)::text FROM arbitrum_freeze_events
     UNION ALL
     SELECT 'governance_proposals', COUNT(*)::text FROM governance_proposals`,
  );
  const out = {
    wallet_flows: 0,
    multisig_events: 0,
    arbitrum_freeze_events: 0,
    governance_proposals: 0,
  };
  for (const r of rows) {
    out[r.table as keyof typeof out] = Number(r.count);
  }
  return out;
}

export interface GovernanceProposal {
  id: string;
  source: string;
  space: string | null;
  title: string;
  description: string | null;
  url: string | null;
  state: string;
  votes_for_wei: string | null;
  votes_against_wei: string | null;
  votes_abstain_wei: string | null;
  quorum_wei: string | null;
  proposer: string | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getGovernanceProposals(): Promise<GovernanceProposal[]> {
  return query<GovernanceProposal>(
    `SELECT * FROM governance_proposals
     ORDER BY
       CASE state
         WHEN 'active' THEN 0
         WHEN 'pending' THEN 1
         WHEN 'passed' THEN 2
         WHEN 'rejected' THEN 3
         ELSE 4
       END,
       end_at DESC NULLS LAST,
       created_at DESC`,
  );
}
