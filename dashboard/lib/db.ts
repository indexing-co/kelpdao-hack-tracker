import { Pool } from 'pg';

/**
 * Fetch ETH price in USD from CoinGecko. Cached for 10 minutes.
 * Falls back to $2,300 if the API is unreachable.
 */
export async function getEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return 2300;
    const data = (await res.json()) as { ethereum?: { usd?: number } };
    return Number(data.ethereum?.usd) || 2300;
  } catch {
    return 2300;
  }
}

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

/**
 * Only the Upgraded + UpgradeExecuted events — the actual freeze "fingerprint".
 * MessageDelivered + InboxMessageDelivered fire on every bridge message
 * (~1,300 of them in our data, mostly routine L1->L2 traffic) so we filter
 * them out for the freeze panel.
 */
export async function getRecentFreezeActionEvents(limit = 25): Promise<FreezeEvent[]> {
  return query<FreezeEvent>(
    `SELECT * FROM arbitrum_freeze_events
     WHERE event_name IN ('Upgraded', 'UpgradeExecuted')
     ORDER BY block DESC, log_index DESC LIMIT $1`,
    [limit],
  );
}

export async function getTableCounts(): Promise<{
  wallet_flows: number;
  multisig_events: number;
  freeze_actions: number; // Upgraded + UpgradeExecuted only — the 3 freeze fingerprint events
  l1_messaging_events: number; // total rows in arbitrum_freeze_events (incl. routine bridge traffic)
  arbitrum_proposals: number;
  recovery_proposals: number;
}> {
  const rows = await query<{ key: string; count: string }>(
    `SELECT 'wallet_flows' AS key, COUNT(*)::text AS count FROM wallet_flows
     UNION ALL
     SELECT 'multisig_events', COUNT(*)::text FROM multisig_events
     UNION ALL
     SELECT 'freeze_actions', COUNT(*)::text FROM arbitrum_freeze_events
       WHERE event_name IN ('Upgraded', 'UpgradeExecuted')
     UNION ALL
     SELECT 'l1_messaging_events', COUNT(*)::text FROM arbitrum_freeze_events
     UNION ALL
     SELECT 'arbitrum_proposals', COUNT(*)::text FROM governance_proposals WHERE category = 'arbitrum'
     UNION ALL
     SELECT 'recovery_proposals', COUNT(*)::text FROM governance_proposals WHERE category = 'recovery'`,
  );
  const out = {
    wallet_flows: 0,
    multisig_events: 0,
    freeze_actions: 0,
    l1_messaging_events: 0,
    arbitrum_proposals: 0,
    recovery_proposals: 0,
  };
  for (const r of rows) {
    out[r.key as keyof typeof out] = Number(r.count);
  }
  return out;
}

export interface GovernanceProposal {
  id: string;
  source: string; // snapshot | forum | tweet | site | arbitrum_core | arbitrum_treasury | onchain
  category: 'arbitrum' | 'recovery';
  commitment_type: 'backing' | 'liquidity' | 'info' | null;
  space: string | null;
  title: string;
  description: string | null;
  url: string | null;
  state: string;
  amount_eth: string | null;
  amount_usd: string | null;
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

const PROPOSAL_ORDER = `ORDER BY
  CASE state
    WHEN 'active' THEN 0
    WHEN 'pending' THEN 1
    WHEN 'passed' THEN 2
    WHEN 'rejected' THEN 3
    ELSE 4
  END,
  end_at DESC NULLS LAST,
  created_at DESC`;

export async function getGovernanceProposals(): Promise<GovernanceProposal[]> {
  return query<GovernanceProposal>(`SELECT * FROM governance_proposals ${PROPOSAL_ORDER}`);
}

export async function getGovernanceProposalsByCategory(
  category: 'arbitrum' | 'recovery',
): Promise<GovernanceProposal[]> {
  return query<GovernanceProposal>(
    `SELECT * FROM governance_proposals WHERE category = $1 ${PROPOSAL_ORDER}`,
    [category],
  );
}

/**
 * Recovery pool stats split by commitment_type so the dashboard can show
 * direct rsETH-backing pledges separately from market-liquidity backstops.
 *
 * "Backing" = donations + loans that close the rsETH gap (Stani, EtherFi,
 * Mantle credit facility, Aave DAO, etc.)
 * "Liquidity" = market support, not direct backing (LayerZero's second
 * tranche to Aave markets, USDT deployments, AAVE buys, etc.)
 *
 * The Arbitrum AIP (category='arbitrum') represents the frozen 30,766 ETH
 * that would land in the recovery Safe if the vote passes. Counted
 * separately so it doesn't conflate "voluntary pledges" with "frozen funds
 * pending governance release".
 */
export async function getRecoveryPoolStats(): Promise<{
  backing_eth: string;
  liquidity_eth: string;
  liquidity_usd: string;
  backing_contributors: number;
  liquidity_contributors: number;
  aip_eth: string;
  gap_eth: string;
}> {
  const rows = await query<{
    bucket: string;
    sum_eth: string;
    sum_usd: string;
    cnt: string;
  }>(
    `SELECT
       (CASE WHEN category = 'arbitrum' THEN 'aip' ELSE commitment_type END) AS bucket,
       COALESCE(SUM(amount_eth), 0)::text AS sum_eth,
       COALESCE(SUM(amount_usd), 0)::text AS sum_usd,
       COUNT(*)::text AS cnt
     FROM governance_proposals
     WHERE amount_eth IS NOT NULL OR amount_usd IS NOT NULL
     GROUP BY 1`,
  );
  const map = new Map(rows.map((r) => [r.bucket, r]));
  return {
    backing_eth: map.get('backing')?.sum_eth ?? '0',
    liquidity_eth: map.get('liquidity')?.sum_eth ?? '0',
    liquidity_usd: map.get('liquidity')?.sum_usd ?? '0',
    backing_contributors: Number(map.get('backing')?.cnt ?? '0'),
    liquidity_contributors: Number(map.get('liquidity')?.cnt ?? '0'),
    aip_eth: map.get('aip')?.sum_eth ?? '0',
    gap_eth: '89500',
  };
}
