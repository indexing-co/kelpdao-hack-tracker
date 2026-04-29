#!/usr/bin/env node
/**
 * Verify Kelp's claimed bridge hardening on-chain.
 *
 * Reads the LayerZero V2 OApp configuration for the rsETH OFT adapter
 * across destination chains and decodes the UlnConfig (DVNs, threshold,
 * confirmations).
 *
 * Outputs a JSON receipt that can be used in dashboard + content.
 *
 * Run: node scripts/check-layerzero-config.mjs
 */

import { createPublicClient, http, parseAbi, decodeAbiParameters } from 'viem';
import { mainnet, arbitrum, base, optimism, linea } from 'viem/chains';

// rsETH OFT adapter on Ethereum (per docs/addresses.md)
const RSETH_OFT = '0x85d456b2dff1fd8245387c0bfb64dfb700e98ef3';

// LayerZero V2 EndpointV2 — same address across chains
const ENDPOINT_V2 = '0x1a44076050125825900e736c501f859c50fE728c';

// LayerZero V2 destination Endpoint IDs (eid)
const DST_EIDS = {
  ethereum: 30101,
  arbitrum: 30110,
  optimism: 30111,
  base: 30184,
  linea: 30183,
  mantle: 30181,
};

// configType 2 = ULN (DVN security stack)
const CONFIG_TYPE_ULN = 2;

// Map DVN contract addresses to operator names (lowercased keys)
const DVN_LABELS = {
  '0x380275805876ff19055ea900cdb2b46a94ecf20d': 'Horizen Labs',
  '0x589dedbd617e0cbcb916a9223f4d1300c294236b': 'LayerZero Labs', // ⚠ compromised in the April 18 exploit
  '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd': 'Canary',
  '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5': 'Nethermind',
};

function dvnLabel(addr) {
  return DVN_LABELS[addr.toLowerCase()] ?? `unknown (${addr})`;
}

const ENDPOINT_ABI = parseAbi([
  'function getSendLibrary(address _sender, uint32 _eid) external view returns (address lib)',
  'function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address lib, bool isDefault)',
  'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)',
]);

// UlnConfig is the canonical decoded form
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
  arbitrum: arbitrum,
  base: base,
  optimism: optimism,
  linea: linea,
};

async function readConfigFor(srcChainName, dstName) {
  const client = createPublicClient({
    chain: CHAIN_OBJ[srcChainName],
    transport: http(RPC[srcChainName]),
  });

  const dstEid = DST_EIDS[dstName];
  if (!dstEid) throw new Error(`Unknown dst chain: ${dstName}`);

  // Step 1: get the send library (which holds the config)
  let sendLib;
  try {
    sendLib = await client.readContract({
      address: ENDPOINT_V2,
      abi: ENDPOINT_ABI,
      functionName: 'getSendLibrary',
      args: [RSETH_OFT, dstEid],
    });
  } catch (err) {
    return { ok: false, error: `getSendLibrary failed: ${err.shortMessage ?? err.message}` };
  }

  if (sendLib === '0x0000000000000000000000000000000000000000') {
    return { ok: false, error: `no send library set (route not active or default)` };
  }

  // Step 2: get the ULN config blob
  let configBytes;
  try {
    configBytes = await client.readContract({
      address: ENDPOINT_V2,
      abi: ENDPOINT_ABI,
      functionName: 'getConfig',
      args: [RSETH_OFT, sendLib, dstEid, CONFIG_TYPE_ULN],
    });
  } catch (err) {
    return { ok: false, error: `getConfig failed: ${err.shortMessage ?? err.message}` };
  }

  // Step 3: decode the UlnConfig
  let decoded;
  try {
    [decoded] = decodeAbiParameters(ULN_CONFIG_TYPE, configBytes);
  } catch (err) {
    return { ok: false, error: `decode failed: ${err.message}`, raw: configBytes };
  }

  return {
    ok: true,
    sendLib,
    confirmations: Number(decoded.confirmations),
    requiredDVNCount: decoded.requiredDVNCount,
    optionalDVNCount: decoded.optionalDVNCount,
    optionalDVNThreshold: decoded.optionalDVNThreshold,
    requiredDVNs: decoded.requiredDVNs,
    optionalDVNs: decoded.optionalDVNs,
  };
}

async function main() {
  console.log('Checking rsETH OFT bridge config on-chain (LayerZero V2)\n');
  console.log(`OFT adapter: ${RSETH_OFT}`);
  console.log(`Endpoint:    ${ENDPOINT_V2}\n`);

  const pairs = [
    { src: 'ethereum', dst: 'arbitrum' },
    { src: 'ethereum', dst: 'base' },
    { src: 'ethereum', dst: 'optimism' },
    { src: 'ethereum', dst: 'linea' },
    { src: 'arbitrum', dst: 'ethereum' },
    { src: 'base', dst: 'ethereum' },
    { src: 'optimism', dst: 'ethereum' },
  ];

  const results = [];
  for (const { src, dst } of pairs) {
    process.stdout.write(`${src.padEnd(10)} → ${dst.padEnd(10)}  `);
    const res = await readConfigFor(src, dst);
    if (!res.ok) {
      console.log(`✗ ${res.error}`);
    } else {
      console.log(
        `${res.requiredDVNCount}-of-${res.requiredDVNCount} required, ${res.optionalDVNCount} optional (thresh ${res.optionalDVNThreshold}), ${res.confirmations} confirmations`,
      );
    }
    results.push({ src, dst, ...res });
  }

  console.log('\nFull DVN addresses:');
  for (const r of results) {
    if (!r.ok) continue;
    console.log(`\n${r.src} → ${r.dst}:`);
    console.log(`  send library: ${r.sendLib}`);
    console.log(`  required DVNs (${r.requiredDVNCount}):`);
    r.requiredDVNs.forEach((d, i) => console.log(`    ${i + 1}. ${d}`));
    if (r.optionalDVNCount > 0) {
      console.log(`  optional DVNs (${r.optionalDVNCount}, threshold ${r.optionalDVNThreshold}):`);
      r.optionalDVNs.forEach((d, i) => console.log(`    ${i + 1}. ${d}`));
    }
    console.log(`  confirmations: ${r.confirmations}`);
  }

  // Save JSON receipt
  const fs = await import('node:fs/promises');
  await fs.writeFile(
    new URL('../docs/rseth-oft-config-2026-04-29.json', import.meta.url),
    JSON.stringify({ readAt: new Date().toISOString(), oft: RSETH_OFT, endpoint: ENDPOINT_V2, results }, null, 2),
  );
  console.log('\nReceipt saved to docs/rseth-oft-config-2026-04-29.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
