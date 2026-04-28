/**
 * Pipe: ethereum-arbitrum-freeze-events
 *
 * Decodes events from the L1 Ethereum contracts that constitute an Arbitrum
 * "freeze action" — i.e. an emergency Inbox upgrade that lets the Security
 * Council impersonate any sender on a single L1→L2 message.
 *
 * Watched contracts:
 *   - 0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f  Arbitrum: Delayed Inbox
 *   - 0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a  Arbitrum: Bridge
 *   - 0x3fffbadaf827559da092217e474760e2b2c3cedd  Arbitrum Foundation: Upgrade Executor
 *
 * Output: rows in `arbitrum_freeze_events` table.
 *
 * The historical freeze (April 21, 2026, block 24,925,592) emitted:
 *   - Delayed Inbox: Upgraded(impersonation impl)
 *   - Bridge: MessageDelivered(impersonated tx)
 *   - Delayed Inbox: InboxMessageDelivered(payload)
 *   - Delayed Inbox: Upgraded(original impl, restoring)
 *   - Upgrade Executor: UpgradeExecuted
 */
function transform(block) {
  const CONTRACTS = {
    '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f': 'Arbitrum: Delayed Inbox',
    '0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a': 'Arbitrum: Bridge',
    '0x3fffbadaf827559da092217e474760e2b2c3cedd': 'Arbitrum Foundation: Upgrade Executor',
  };

  const SIGS = [
    'event Upgraded(address indexed nextVersion)',
    'event MessageDelivered(uint256 indexed messageIndex, bytes32 indexed beforeInboxAcc, address inbox, uint8 kind, address sender, bytes32 messageDataHash, uint256 baseFeeL1, uint64 timestamp)',
    'event InboxMessageDelivered(uint256 indexed messageNum, bytes data)',
    'event UpgradeExecuted(address indexed upgrade, uint256 value, bytes data)',
  ];

  const blockNum = Number(block.number);
  const blockTsSec = Number(BigInt(block.timestamp || '0x0'));
  const blockTimestamp = new Date(blockTsSec * 1000).toISOString();
  const out = [];

  for (const tx of block.transactions || []) {
    for (const log of tx.receipt?.logs || []) {
      const addr = (log.address || '').toLowerCase();
      const label = CONTRACTS[addr];
      if (!label) continue;

      const result = utils.evmDecodeLogWithMetadata(log, SIGS);
      if (!result) continue;
      const eventName = (result.metadata?.name || '').replace(/^event /, '').split('(')[0].trim();

      out.push({
        chain: 'ethereum',
        block: blockNum,
        block_timestamp: blockTimestamp,
        transaction_hash: tx.hash,
        log_index: log.logIndex,
        contract_address: addr,
        contract_label: label,
        event_name: eventName,
        decoded: result.decoded,
      });
    }
  }

  return out;
}
