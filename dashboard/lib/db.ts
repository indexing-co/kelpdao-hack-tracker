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
}> {
  const rows = await query<{ table: string; count: string }>(
    `SELECT 'wallet_flows' AS table, COUNT(*)::text AS count FROM wallet_flows
     UNION ALL
     SELECT 'multisig_events', COUNT(*)::text FROM multisig_events
     UNION ALL
     SELECT 'arbitrum_freeze_events', COUNT(*)::text FROM arbitrum_freeze_events`,
  );
  const out = { wallet_flows: 0, multisig_events: 0, arbitrum_freeze_events: 0 };
  for (const r of rows) {
    out[r.table as keyof typeof out] = Number(r.count);
  }
  return out;
}
