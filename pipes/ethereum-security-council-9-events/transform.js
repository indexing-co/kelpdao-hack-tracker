/**
 * Pipe: ethereum-security-council-9-events
 *
 * Decodes Gnosis Safe events emitted by the Arbitrum Foundation: L1 Security
 * Council 9 multisig (0xF06E95eF589D9c38af242a8AAee8375f14023F85). Each
 * ExecutionSuccess on this Safe is a real-world emergency action — the freeze
 * itself was one of these.
 *
 * Output: rows in `multisig_events` table.
 */
function transform(block) {
  const SAFE_ADDRESS = '0xf06e95ef589d9c38af242a8aaee8375f14023f85';

  const SIGS = [
    'event ExecutionSuccess(bytes32 txHash, uint256 payment)',
    'event ExecutionFailure(bytes32 txHash, uint256 payment)',
    'event ApproveHash(bytes32 indexed approvedHash, address indexed owner)',
    'event SignMsg(bytes32 indexed msgHash)',
    'event AddedOwner(address owner)',
    'event RemovedOwner(address owner)',
    'event ChangedThreshold(uint256 threshold)',
    'event ExecutionFromModuleSuccess(address indexed module)',
    'event ExecutionFromModuleFailure(address indexed module)',
  ];

  const blockNum = Number(block.number);
  const blockTsSec = Number(BigInt(block.timestamp || '0x0'));
  const blockTimestamp = new Date(blockTsSec * 1000).toISOString();
  const out = [];

  for (const tx of block.transactions || []) {
    for (const log of tx.receipt?.logs || []) {
      if ((log.address || '').toLowerCase() !== SAFE_ADDRESS) continue;

      const result = utils.evmDecodeLogWithMetadata(log, SIGS);
      if (!result) continue;
      // result shape: { decoded: {...fields}, metadata: { name: "event Name(...)" } }
      const eventName = (result.metadata?.name || '').replace(/^event /, '').split('(')[0].trim();

      out.push({
        chain: 'ethereum',
        block: blockNum,
        block_timestamp: blockTimestamp,
        transaction_hash: tx.hash,
        log_index: log.logIndex,
        contract_address: SAFE_ADDRESS,
        event_name: eventName,
        decoded: result.decoded,
      });
    }
  }

  return out;
}
