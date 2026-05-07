#!/usr/bin/env node
/**
 * Populate oapp_metadata for every distinct OApp in oapp_uln_config_changes.
 *
 * For each OApp address:
 *   1. Try the ERC-20 trio: name() / symbol() / decimals()
 *   2. If the calls succeed, mark is_erc20=true and store the strings
 *   3. If they revert (non-ERC20 OApp), still write a row with
 *      is_erc20=false so we don't keep re-trying it
 *
 * Run with:
 *   DATABASE_URL_DIRECT=... node scripts/seed-oapp-metadata.mjs
 *
 * Idempotent: re-running re-resolves any rows older than --max-age (default
 * 30 days) and pulls any newly-discovered OApps. Safe to run on a cron.
 */

import { Client } from 'pg';
import { createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';

const RPC = process.env.MAINNET_RPC ?? 'https://ethereum-rpc.publicnode.com';
const DB_URL =
  process.env.DATABASE_URL_DIRECT ??
  process.env.DATABASE_URL ??
  null;

if (!DB_URL) {
  console.error('Set DATABASE_URL_DIRECT (or DATABASE_URL) to the Neon unpooled connection string.');
  process.exit(1);
}

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

const client = createPublicClient({ chain: mainnet, transport: http(RPC) });

async function tryRead(oapp) {
  const out = { is_erc20: false, name: null, symbol: null, decimals: null };
  try {
    out.name = await client.readContract({
      address: oapp,
      abi: ERC20_ABI,
      functionName: 'name',
    });
  } catch {
    // OApp is not ERC-20-compatible. Move on.
    return out;
  }
  try {
    out.symbol = await client.readContract({
      address: oapp,
      abi: ERC20_ABI,
      functionName: 'symbol',
    });
  } catch {
    out.symbol = null;
  }
  try {
    out.decimals = await client.readContract({
      address: oapp,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
  } catch {
    out.decimals = null;
  }
  out.is_erc20 = !!out.name; // we got at least name()
  return out;
}

async function main() {
  const db = new Client(DB_URL);
  await db.connect();

  // Pull every distinct OApp we've seen + how stale our metadata is.
  const { rows: targets } = await db.query(
    `SELECT DISTINCT c.oapp,
            m.resolved_at,
            (m.oapp IS NULL) AS missing
     FROM oapp_uln_config_changes c
     LEFT JOIN oapp_metadata m ON m.oapp = c.oapp
     WHERE m.oapp IS NULL
        OR m.resolved_at < NOW() - INTERVAL '30 days'
     ORDER BY missing DESC, c.oapp`
  );

  console.log(`Resolving metadata for ${targets.length} OApps...`);

  let resolved = 0;
  let nonErc20 = 0;
  for (let i = 0; i < targets.length; i++) {
    const { oapp } = targets[i];
    process.stdout.write(`  [${i + 1}/${targets.length}] ${oapp.slice(0, 12)}…  `);
    const meta = await tryRead(oapp);
    if (meta.is_erc20) {
      console.log(`${meta.symbol ?? '?'} (${(meta.name ?? '?').slice(0, 40)})`);
      resolved++;
    } else {
      console.log('non-ERC20');
      nonErc20++;
    }

    await db.query(
      `INSERT INTO oapp_metadata (oapp, chain, name, symbol, decimals, is_erc20, resolved_at)
       VALUES ($1, 'ethereum', $2, $3, $4, $5, NOW())
       ON CONFLICT (oapp) DO UPDATE SET
         name = EXCLUDED.name,
         symbol = EXCLUDED.symbol,
         decimals = EXCLUDED.decimals,
         is_erc20 = EXCLUDED.is_erc20,
         resolved_at = NOW()`,
      [oapp, meta.name, meta.symbol, meta.decimals, meta.is_erc20],
    );
  }

  await db.end();
  console.log(`\nDone. Resolved ${resolved} ERC-20 OApps + ${nonErc20} non-ERC-20.`);
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
