#!/usr/bin/env node
/**
 * Verify KelpDAO's claim about shared ADMIN_ROLE membership between the
 * LayerZero Labs DVN and the Nethermind DVN.
 *
 * From Kelp's "Setting the Record Straight" post:
 *
 *   "The LayerZero Labs DVN and Nethermind DVN share substantial overlap
 *    in addresses granted ADMIN_ROLE on both contracts: ten addresses on
 *    8 April 2026, and five additional addresses on 6 February 2025.
 *    ADMIN_ROLE confers the ability to pause the DVN, alter operational
 *    parameters, update pricing, and execute privileged actions. This is
 *    concerning as it puts into question the independence of the DVNs."
 *
 * Method:
 *   1. Scan RoleGranted + RoleRevoked events from each DVN contract since
 *      deployment.
 *   2. Reconstruct the current ADMIN_ROLE membership client-side
 *      (granted minus revoked).
 *   3. Compare the two sets, output the intersection.
 *
 * Free + public RPC. No API keys.
 */

import { createPublicClient, http, parseAbi, parseAbiItem, keccak256, toHex } from 'viem';
import { mainnet } from 'viem/chains';

const RPC = process.env.MAINNET_RPC ?? 'https://ethereum-rpc.publicnode.com';

// Both DVNs are AccessControl-derived. The standard role identifiers are
// keccak256 of the role name string. LayerZero uses ADMIN_ROLE not the
// default DEFAULT_ADMIN_ROLE (= 0x0).
const ADMIN_ROLE = keccak256(toHex('ADMIN_ROLE'));

const DVNS = {
  'LayerZero Labs': '0x589dEDbD617e0CBcB916A9223F4d1300c294236b',
  Nethermind: '0xa59BA433ac34D2927232918Ef5B2eaAfcF130BA5',
};

// Use EARLIEST plausible block we have to scan from. Both DVN contracts
// were deployed in 2023; we use a 2023 block as a safe lower bound.
const FROM_BLOCK = 17_000_000n;
const CHUNK = 9_999n;

const ROLE_GRANTED = parseAbiItem(
  'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
);
const ROLE_REVOKED = parseAbiItem(
  'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
);

async function reconstructAdminSet(client, dvnAddress, latest) {
  const granted = new Set();
  const revoked = new Map(); // account -> last revoked block

  let cur = FROM_BLOCK;
  while (cur <= latest) {
    const to = cur + CHUNK > latest ? latest : cur + CHUNK;

    // Query RoleGranted + RoleRevoked separately because viem's `events`
    // multi-filter doesn't always cooperate with public RPCs.
    const [gLogs, rLogs] = await Promise.all([
      client.getLogs({
        address: dvnAddress,
        event: ROLE_GRANTED,
        args: { role: ADMIN_ROLE },
        fromBlock: cur,
        toBlock: to,
      }),
      client.getLogs({
        address: dvnAddress,
        event: ROLE_REVOKED,
        args: { role: ADMIN_ROLE },
        fromBlock: cur,
        toBlock: to,
      }),
    ]);

    for (const log of gLogs) {
      granted.add(log.args.account.toLowerCase());
    }
    for (const log of rLogs) {
      revoked.set(log.args.account.toLowerCase(), log.blockNumber);
    }
    process.stdout.write(`.`);
    cur = to + 1n;
  }
  process.stdout.write('\n');

  // For correctness, an account that was granted, revoked, then re-granted
  // is currently a member. The reconstruction above is too crude: we'd
  // need to compare last-grant vs last-revoke per account. Re-do that:
  // walk all events in chronological order.
  return { granted, revoked };
}

async function main() {
  console.log('Checking ADMIN_ROLE membership overlap between LZ Labs DVN + Nethermind DVN');
  console.log('ADMIN_ROLE bytes32:', ADMIN_ROLE);
  console.log();

  const client = createPublicClient({ chain: mainnet, transport: http(RPC) });
  const latest = await client.getBlockNumber();
  console.log('latest block:', latest);
  console.log();

  // Walk events chronologically per DVN to determine CURRENT membership.
  async function currentAdmins(dvnAddress) {
    const role = ADMIN_ROLE;
    const events = [];
    let cur = FROM_BLOCK;
    while (cur <= latest) {
      const to = cur + CHUNK > latest ? latest : cur + CHUNK;
      const [g, r] = await Promise.all([
        client.getLogs({
          address: dvnAddress,
          event: ROLE_GRANTED,
          args: { role },
          fromBlock: cur,
          toBlock: to,
        }),
        client.getLogs({
          address: dvnAddress,
          event: ROLE_REVOKED,
          args: { role },
          fromBlock: cur,
          toBlock: to,
        }),
      ]);
      for (const e of g)
        events.push({
          kind: 'g',
          account: e.args.account.toLowerCase(),
          block: e.blockNumber,
          logIndex: e.logIndex,
        });
      for (const e of r)
        events.push({
          kind: 'r',
          account: e.args.account.toLowerCase(),
          block: e.blockNumber,
          logIndex: e.logIndex,
        });
      process.stdout.write('.');
      cur = to + 1n;
    }
    process.stdout.write('\n');

    events.sort((a, b) => {
      if (a.block !== b.block) return Number(a.block - b.block);
      return a.logIndex - b.logIndex;
    });

    const set = new Set();
    for (const e of events) {
      if (e.kind === 'g') set.add(e.account);
      else set.delete(e.account);
    }
    return { set, eventCount: events.length };
  }

  const results = {};
  for (const [name, addr] of Object.entries(DVNS)) {
    console.log(`Scanning ${name} (${addr})`);
    results[name] = await currentAdmins(addr);
    console.log(`  ${results[name].set.size} current admins (from ${results[name].eventCount} events)`);
    console.log();
  }

  const lzAdmins = results['LayerZero Labs'].set;
  const nmAdmins = results['Nethermind'].set;

  const overlap = [...lzAdmins].filter((a) => nmAdmins.has(a));

  console.log('=== Overlap analysis ===');
  console.log(`LayerZero Labs DVN: ${lzAdmins.size} ADMIN_ROLE holders`);
  console.log(`Nethermind DVN:     ${nmAdmins.size} ADMIN_ROLE holders`);
  console.log(`Shared addresses:   ${overlap.length}`);
  console.log();
  console.log('Shared admins:');
  for (const a of overlap) console.log('  ' + a);
  console.log();
  console.log('LZ-only admins:');
  for (const a of lzAdmins) if (!nmAdmins.has(a)) console.log('  ' + a);
  console.log();
  console.log('Nethermind-only admins:');
  for (const a of nmAdmins) if (!lzAdmins.has(a)) console.log('  ' + a);

  // Save receipt
  const fs = await import('node:fs/promises');
  const outPath = new URL('../docs/dvn-admin-overlap.json', import.meta.url);
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        readAt: new Date().toISOString(),
        latestBlock: latest.toString(),
        adminRoleBytes32: ADMIN_ROLE,
        dvns: Object.fromEntries(
          Object.entries(results).map(([k, v]) => [
            k,
            { adminCount: v.set.size, eventCount: v.eventCount, admins: [...v.set] },
          ]),
        ),
        sharedAdmins: overlap,
      },
      null,
      2,
    ),
  );
  console.log(`\nReceipt saved to docs/dvn-admin-overlap.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
