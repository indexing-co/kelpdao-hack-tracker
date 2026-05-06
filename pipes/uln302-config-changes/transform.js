/**
 * Decode LayerZero V2 ULN302 config-change events.
 *
 * The `UlnConfigSet` event carries a complex tuple in `data`. The Indexing Co
 * helper `evmDecodeLogWithMetadata` doesn't handle inline tuples, so we decode
 * the data field directly with viem's `decodeAbiParameters`.
 *
 * Event signature (verified from on-chain inspection):
 *   UlnConfigSet(address oapp, uint32 eid, UlnConfig config)
 *   UlnConfig = (uint64, uint8, uint8, uint8, address[], address[])
 *   topic[0] = 0x82118522... (no indexed args, all data)
 *
 * Output: rows in `oapp_uln_config_changes`. The `contract_address` field is
 * the log emitter (the ULN302 library) — named `contract_address` so
 * pipeline-level `filterKeys=["contract_address"]` post-filtering applies.
 */
function transform(block) {
  const ULN_CONFIG_SET_TOPIC =
    '0x82118522aa536ac0e96cc5c689407ae42b89d592aa133890a01f1509842f5081';

  const PARAMS = [
    { type: 'address', name: 'oapp' },
    { type: 'uint32', name: 'eid' },
    {
      type: 'tuple',
      name: 'config',
      components: [
        { type: 'uint64', name: 'confirmations' },
        { type: 'uint8', name: 'requiredDVNCount' },
        { type: 'uint8', name: 'optionalDVNCount' },
        { type: 'uint8', name: 'optionalDVNThreshold' },
        { type: 'address[]', name: 'requiredDVNs' },
        { type: 'address[]', name: 'optionalDVNs' },
      ],
    },
  ];

  const out = [];
  const blockTsSec = Number(BigInt(block.timestamp || '0x0'));
  const blockTimestamp = new Date(blockTsSec * 1000).toISOString();

  for (const tx of block.transactions || []) {
    for (const log of tx.receipt?.logs || []) {
      if ((log.topics?.[0] || '').toLowerCase() !== ULN_CONFIG_SET_TOPIC) continue;

      let decoded;
      try {
        decoded = viem.decodeAbiParameters(PARAMS, log.data);
      } catch (e) {
        continue;
      }

      const [oapp, eid, cfg] = decoded;
      if (!cfg) continue;

      out.push({
        chain: (block._network || '').toLowerCase(),
        block: Number(block.number),
        block_timestamp: blockTimestamp,
        tx_hash: tx.hash,
        log_index: log.logIndex,
        contract_address: (log.address || '').toLowerCase(),
        oapp: (oapp || '').toLowerCase(),
        dst_eid: Number(eid),
        confirmations: cfg.confirmations.toString(),
        required_dvn_count: Number(cfg.requiredDVNCount),
        optional_dvn_count: Number(cfg.optionalDVNCount),
        optional_dvn_threshold: Number(cfg.optionalDVNThreshold),
        // JSONB objects, not raw arrays — see schema.sql for why.
        required_dvns: { addresses: (cfg.requiredDVNs || []).map((a) => a.toLowerCase()) },
        optional_dvns: { addresses: (cfg.optionalDVNs || []).map((a) => a.toLowerCase()) },
      });
    }
  }

  return out;
}
