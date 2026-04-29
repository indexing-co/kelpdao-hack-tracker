#!/usr/bin/env node
/**
 * LayerZero DVN census runner.
 *
 * For every OApp in data/oapp-registry.json, query the EndpointV2
 * outbound config to each destination chain, decode the UlnConfig,
 * and write a snapshot row into oapp_dvn_configs in Neon.
 *
 * Run: node scripts/run-dvn-census.mjs
 *
 * Idempotent. UNIQUE (src_chain, oapp_address, dst_eid, read_at) means
 * each run produces a fresh snapshot row per OApp+route. Schedule via
 * GitHub Actions cron for daily refresh.
 */

import { createPublicClient, http, parseAbi, decodeAbiParameters } from 'viem';
import { mainnet, arbitrum, base, optimism, linea } from 'viem/chains';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

const ENDPOINT_V2 = '0x1a44076050125825900e736c501f859c50fE728c';

const CONFIG_TYPE_ULN = 2;

const ENDPOINT_ABI = parseAbi([
  'function getSendLibrary(address _sender, uint32 _eid) external view returns (address lib)',
  'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)',
]);

const ULN_CONFIG_TYPE = [
  {
    type: 'tuple',
    components: [
      { name: 'confirmations', type: 'uint64' },
      { name: 'requiredDVNCount', type: 'uint8' },
      { name: 'optionalDVNCount', type: 'uint8' },
      { name: 'optionalDVNThreshold', type: 'uint8' },
      { name: 'requiredDVNs', type: 'address[]' },
      { name: 'optionalDVNs', type: 'address[]' },
    ],
  },
];

const RPC = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  base: 'https://mainnet.base.org',
  optimism: 'https://mainnet.optimism.io',
  linea: 'https://rpc.linea.build',
};

const CHAIN_OBJ = {
  ethereum: mainnet,
  arbitrum,
  base,
  optimism,
  linea,
};

const DST_EIDS = {
  ethereum: 30101,
  arbitrum: 30110,
  optimism: 30111,
  base: 30184,
  linea: 30183,
  mantle: 30181,
};

// For each src chain, what destinations should we query?
// Use 'all-other-chains' as the default — we query every other registered eid.
const DESTINATIONS_FOR_SRC = {
  ethereum: ['arbitrum', 'base', 'optimism', 'linea'],
  arbitrum: ['ethereum'],
  base: ['ethereum'],
  optimism: ['ethereum'],
  linea: ['ethereum'],
};

async function readConfig(srcChainName, oapp, dstName, dstEid) {
  const client = createPublicClient({
    chain: CHAIN_OBJ[srcChainName],
    transport: http(RPC[srcChainName]),
  });

  let sendLib;
  try {
    sendLib = await client.readContract({
      address: ENDPOINT_V2,
      abi: ENDPOINT_ABI,
      functionName: 'getSendLibrary',
      args: [oapp, dstEid],
    });
  } catch (err) {
    return { ok: false, error: `getSendLibrary: ${err.shortMessage ?? err.message}` };
  }

  if (sendLib === '0x0000000000000000000000000000000000000000') {
    return { ok: false, error: 'no send library set (route not configured / default)' };
  }

  let configBytes;
  try {
    configBytes = await client.readContract({
      address: ENDPOINT_V2,
      abi: ENDPOINT_ABI,
      functionName: 'getConfig',
      args: [oapp, sendLib, dstEid, CONFIG_TYPE_ULN],
    });
  } catch (err) {
    return { ok: false, error: `getConfig: ${err.shortMessage ?? err.message}` };
  }

  let decoded;
  try {
    [decoded] = decodeAbiParameters(ULN_CONFIG_TYPE, configBytes);
  } catch (err) {
    return { ok: false, error: `decode: ${err.message}` };
  }

  let block;
  try {
    block = await client.getBlockNumber();
  } catch {
    block = null;
  }

  return {
    ok: true,
    sendLib,
    confirmations: Number(decoded.confirmations),
    requiredDVNCount: Number(decoded.requiredDVNCount),
    optionalDVNCount: Number(decoded.optionalDVNCount),
    optionalDVNThreshold: Number(decoded.optionalDVNThreshold),
    requiredDVNs: decoded.requiredDVNs,
    optionalDVNs: decoded.optionalDVNs,
    block: block ? Number(block) : null,
  };
}

async function writeSnapshot(pool, oapp, dst, result, readAt) {
  if (!result.ok) return;
  await pool.query(
    `INSERT INTO oapp_dvn_configs
       (src_chain, oapp_address, oapp_name, protocol, dst_eid, dst_chain,
        send_library, required_dvn_count, optional_dvn_count, optional_dvn_threshold,
        required_dvns, optional_dvns, confirmations, read_at, read_block, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (src_chain, oapp_address, dst_eid, read_at) DO NOTHING`,
    [
      oapp.chain,
      oapp.oapp.toLowerCase(),
      oapp.name ?? null,
      oapp.protocol ?? null,
      DST_EIDS[dst],
      dst,
      result.sendLib?.toLowerCase() ?? null,
      result.requiredDVNCount,
      result.optionalDVNCount,
      result.optionalDVNThreshold,
      result.requiredDVNs.map((d) => d.toLowerCase()),
      result.optionalDVNs?.map((d) => d.toLowerCase()) ?? [],
      result.confirmations,
      readAt,
      result.block,
      oapp.notes ?? null,
    ],
  );
}

async function main() {
  const registryPath = new URL('../data/oapp-registry.json', import.meta.url);
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const oapps = registry.oapps;

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const readAt = new Date().toISOString();

  console.log(`DVN census run @ ${readAt}`);
  console.log(`OApps: ${oapps.length}`);

  let snapshots = 0;
  let errors = 0;

  try {
    for (const oapp of oapps) {
      const dsts = DESTINATIONS_FOR_SRC[oapp.chain] ?? [];
      if (dsts.length === 0) {
        console.log(`  ${oapp.name}: no destinations configured for src=${oapp.chain}`);
        continue;
      }
      for (const dst of dsts) {
        const result = await readConfig(oapp.chain, oapp.oapp, dst, DST_EIDS[dst]);
        if (!result.ok) {
          errors++;
          console.log(`  ${oapp.name} ${oapp.chain} → ${dst}: ✗ ${result.error}`);
          continue;
        }
        await writeSnapshot(pool, oapp, dst, result, readAt);
        snapshots++;
        console.log(
          `  ${oapp.name} ${oapp.chain} → ${dst}: ${result.requiredDVNCount}-of-${result.requiredDVNCount}, ${result.confirmations} conf`,
        );
      }
    }
  } finally {
    await pool.end();
  }

  console.log(`\n${snapshots} snapshots written. ${errors} errors.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
