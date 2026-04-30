#!/usr/bin/env node
/**
 * Find the on-chain setConfig events where KelpDAO hardened the rsETH OFT
 * bridge after the April 18 exploit.
 *
 * Strategy:
 * 1. Query the ULN302 send library on Ethereum mainnet for `UlnConfigSet`
 *    events. `oapp` is NOT indexed in this event so we filter by data prefix
 *    (the first 32 bytes of `data` are the padded oapp address).
 * 2. Decode the event payload to get the post-state.
 * 3. Read getConfig at block N-1 to capture the pre-state.
 * 4. Print + save a JSON receipt with tx hash, block, eid, pre, post, sender.
 */

import {
  createPublicClient,
  http,
  parseAbi,
  decodeAbiParameters,
  decodeEventLog,
  parseAbiItem,
} from 'viem';
import { mainnet } from 'viem/chains';

const RSETH_OFT = '0x85d456b2dff1fd8245387c0bfb64dfb700e98ef3';
const ENDPOINT_V2 = '0x1a44076050125825900e736c501f859c50fE728c';
const ULN302_SEND_MAINNET = '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1';

const ULN_CONFIG_SET_TOPIC =
  '0x82118522aa536ac0e96cc5c689407ae42b89d592aa133890a01f1509842f5081';

const CONFIG_TYPE_ULN = 2;

// LayerZero V2 EIDs we can label. Anything not in this map renders as
// `eid-NNNNN` — we'd rather show an honest unknown than guess.
const DST_EID_TO_NAME = {
  30101: 'ethereum',
  30102: 'bnb',
  30106: 'avalanche',
  30109: 'polygon',
  30110: 'arbitrum',
  30111: 'optimism',
  30112: 'fantom',
  30125: 'celo',
  30150: 'astar',
  30165: 'sei',
  30181: 'mantle',
  30183: 'linea',
  30184: 'base',
  30214: 'scroll',
  30217: 'gravity',
  30243: 'blast',
  30260: 'taiko',
  30274: 'bitlayer',
  30303: 'flow',
  30320: 'tron',
  30325: 'iota',
  30329: 'ink',
  30332: 'sonic',
  30335: 'lens',
  30339: 'unichain',
  30362: 'cronos',
  30367: 'soneium',
  30377: 'berachain',
  30383: 'monad',
  30390: 'morph',
  30396: 'corn',
  30398: 'plume',
};

const DVN_LABELS = {
  '0x380275805876ff19055ea900cdb2b46a94ecf20d': 'Horizen Labs',
  '0x589dedbd617e0cbcb916a9223f4d1300c294236b': 'LayerZero Labs',
  '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd': 'Canary',
  '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5': 'Nethermind',
};

function dvnLabel(addr) {
  if (!addr) return '(none)';
  return DVN_LABELS[addr.toLowerCase()] ?? addr;
}

const ENDPOINT_ABI = parseAbi([
  'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)',
]);

const ULN_CONFIG_SET_EVENT = parseAbiItem(
  'event UlnConfigSet(address oapp, uint32 eid, (uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs) config)',
);

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

const RPC = process.env.MAINNET_RPC ?? 'https://ethereum-rpc.publicnode.com';
const FROM_BLOCK = 24_870_000n; // ~April 17, 2026

async function decodeConfigAt(client, blockNumber, eid) {
  try {
    const bytes = await client.readContract({
      address: ENDPOINT_V2,
      abi: ENDPOINT_ABI,
      functionName: 'getConfig',
      args: [RSETH_OFT, ULN302_SEND_MAINNET, eid, CONFIG_TYPE_ULN],
      blockNumber,
    });
    if (!bytes || bytes === '0x') return null;
    const [decoded] = decodeAbiParameters(ULN_CONFIG_TYPE, bytes);
    return {
      confirmations: Number(decoded.confirmations),
      requiredDVNCount: decoded.requiredDVNCount,
      optionalDVNCount: decoded.optionalDVNCount,
      optionalDVNThreshold: decoded.optionalDVNThreshold,
      requiredDVNs: [...decoded.requiredDVNs],
      optionalDVNs: [...decoded.optionalDVNs],
    };
  } catch (err) {
    return { error: err.shortMessage ?? err.message };
  }
}

function summarise(cfg) {
  if (!cfg) return '(no config / using default)';
  if (cfg.error) return `(error: ${cfg.error})`;
  if (cfg.requiredDVNCount === 0) return '0 required DVNs (default config)';
  const dvnList = cfg.requiredDVNs.map(dvnLabel).join(', ');
  return `${cfg.requiredDVNCount}-of-${cfg.requiredDVNCount} [${dvnList}], ${cfg.confirmations} conf`;
}

async function main() {
  console.log('Hunting for KelpDAO rsETH OFT hardening txs on mainnet ULN302...\n');
  console.log(`OApp:        ${RSETH_OFT}`);
  console.log(`ULN302 send: ${ULN302_SEND_MAINNET}`);
  console.log(`From block:  ${FROM_BLOCK}\n`);

  const client = createPublicClient({ chain: mainnet, transport: http(RPC) });
  const latest = await client.getBlockNumber();
  console.log(`Latest block: ${latest}\n`);

  const oappPaddedLower =
    '0x' + RSETH_OFT.slice(2).padStart(64, '0').toLowerCase();

  const CHUNK = 9_999n;
  const matched = [];
  let from = FROM_BLOCK;
  while (from <= latest) {
    const to = from + CHUNK > latest ? latest : from + CHUNK;
    process.stdout.write(`  scan ${from} → ${to}... `);
    try {
      const logs = await client.getLogs({
        address: ULN302_SEND_MAINNET,
        topics: [ULN_CONFIG_SET_TOPIC],
        fromBlock: from,
        toBlock: to,
      });
      // Public RPC's topic filter is unreliable (returns extra topic[0]s),
      // so re-check both the topic and the oapp prefix client-side.
      const hits = logs.filter(
        (l) =>
          l.topics[0]?.toLowerCase() === ULN_CONFIG_SET_TOPIC.toLowerCase() &&
          l.data.slice(0, 66).toLowerCase() === oappPaddedLower,
      );
      if (hits.length > 0) console.log(`${hits.length} hit(s)`);
      else console.log(`${logs.length} total, 0 kelp`);
      matched.push(...hits);
    } catch (e) {
      console.log(`ERR ${e.shortMessage ?? e.message}`);
    }
    from = to + 1n;
  }

  if (matched.length === 0) {
    console.log('\nNo Kelp hardening events found in this range.');
    return;
  }

  console.log(`\nFound ${matched.length} UlnConfigSet event(s) for rsETH OFT.\n`);

  // Group by tx so we can record per-tx context cleanly.
  const byTx = new Map();
  for (const ev of matched) {
    if (!byTx.has(ev.transactionHash)) byTx.set(ev.transactionHash, []);
    byTx.get(ev.transactionHash).push(ev);
  }

  console.log(`Distinct hardening txs: ${byTx.size}\n`);

  const results = [];
  for (const [txHash, evs] of byTx) {
    const first = evs[0];
    const block = await client.getBlock({ blockNumber: first.blockNumber });
    const tx = await client.getTransaction({ hash: txHash });

    console.log(`---`);
    console.log(`tx:        ${txHash}`);
    console.log(`block:     ${first.blockNumber}  (${new Date(Number(block.timestamp) * 1000).toISOString()})`);
    console.log(`from:      ${tx.from}`);
    console.log(`to:        ${tx.to}`);
    console.log(`routes:    ${evs.length}`);

    const routes = [];
    for (const ev of evs) {
      const decoded = decodeEventLog({
        abi: [ULN_CONFIG_SET_EVENT],
        data: ev.data,
        topics: ev.topics,
      });
      const eid = Number(decoded.args.eid);
      const dstName = DST_EID_TO_NAME[eid] ?? `eid-${eid}`;

      const post = await decodeConfigAt(client, ev.blockNumber, eid);
      const pre = await decodeConfigAt(client, ev.blockNumber - 1n, eid);

      console.log(`  → ${dstName.padEnd(10)} (eid ${eid})`);
      console.log(`     pre:  ${summarise(pre)}`);
      console.log(`     post: ${summarise(post)}`);

      routes.push({
        dstEid: eid,
        dstName,
        pre,
        post,
      });
    }

    results.push({
      txHash,
      blockNumber: first.blockNumber.toString(),
      blockTimestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      from: tx.from,
      to: tx.to,
      routes,
    });
  }

  const fs = await import('node:fs/promises');
  const outPath = new URL('../docs/rseth-oft-hardening-events.json', import.meta.url);
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        readAt: new Date().toISOString(),
        oft: RSETH_OFT,
        sendLibrary: ULN302_SEND_MAINNET,
        endpoint: ENDPOINT_V2,
        events: results,
      },
      null,
      2,
    ),
  );
  console.log(`\nReceipt saved to docs/rseth-oft-hardening-events.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
