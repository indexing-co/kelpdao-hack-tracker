/**
 * layerzero-v2-packets-sent — transform
 *
 * WHAT THIS DOES
 * --------------
 * For every PacketSent event emitted by EndpointV2, decode the packet
 * header to extract: source OApp, source/destination eid pair, nonce,
 * guid, and the message size. One row per event. The result lets us
 * answer questions like "what % of LayerZero V2 messages on Ethereum
 * mainnet were sent by OApps configured with LayerZero Labs as their
 * required DVN" — which is the central claim KelpDAO made in their
 * post-mortem (~90% per their reading of public data).
 *
 * Cross-table query lives in the dashboard / SQL: join this table
 * against `oapp_uln_config_changes` (the existing pipe) using a
 * temporal lookup ("what UlnConfigSet was active for this OApp+dst_eid
 * at this block?") to attribute each packet to a DVN configuration.
 *
 * EVENT SHAPE
 * -----------
 * Event signature on EndpointV2:
 *   event PacketSent(bytes encodedPayload, bytes options, address sendLibrary);
 *
 * topic[0] = keccak256("PacketSent(bytes,bytes,address)")
 *          = 0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f
 *
 * NONE of the parameters are indexed (all sit in `data`). Same gotcha
 * as the UlnConfigSet pipe — public RPC topic filters lie about this
 * occasionally, so we double-check topic[0] inside the transform.
 *
 * PACKET ENCODING (encodedPayload)
 * --------------------------------
 * Per LayerZero V2 EndpointV2 source (PacketV1Codec):
 *   offset 0,  1 byte    : packet version (always 0x01)
 *   offset 1,  8 bytes   : nonce             (uint64, big-endian)
 *   offset 9,  4 bytes   : srcEid            (uint32)
 *   offset 13, 32 bytes  : sender            (left-padded address — the source OApp)
 *   offset 45, 4 bytes   : dstEid            (uint32)
 *   offset 49, 32 bytes  : receiver          (bytes32 — could be EVM address or non-EVM identifier)
 *   offset 81, 32 bytes  : guid              (bytes32 — globally unique message id)
 *   offset 113+, bytes   : message payload   (variable length, ABI-encoded by the OApp)
 *
 * So fixed prefix is 113 bytes; everything past that is the message.
 *
 * GOTCHAS WE INHERITED FROM THE EARLIER PIPE
 * ------------------------------------------
 * 1. Top-level `const` is rejected by the transform sandbox. All
 *    constants live inside `transform()`.
 * 2. `evmDecodeLogWithMetadata` chokes on inline tuples — we decode
 *    the bytes payload ourselves with viem.decodeAbiParameters / hand-
 *    sliced byte parsing. PacketSent has no tuple, but encodedPayload
 *    is bytes that we slice manually below.
 * 3. JSONB columns must hold OBJECTS, not raw arrays. We don't have
 *    array fields on this table, so we sidestep that one.
 * 4. Public RPC topic filters are unreliable — re-check topic[0] in
 *    the transform.
 *
 * OPEN QUESTIONS FOR BROCK
 * ------------------------
 * - We only decode the packet HEADER (sender + eids + nonce + guid),
 *   not the message payload. That keeps each row small (~200 bytes).
 *   If we ever want per-OFT amount tracking, we'd need to also slice
 *   the message — but that's typically OApp-specific, so a separate
 *   pipe per OApp standard makes more sense.
 * - This is a HIGH-volume event (mainnet sees thousands per day, L2s
 *   see far more). 90-day backfill is non-trivial. See README for
 *   estimates.
 */

function transform(block) {
  // EndpointV2 is the same address on every chain LayerZero V2 supports.
  // We inline it here rather than relying on the filter alone, because
  // we want a defensive client-side check before decoding.
  const ENDPOINT_V2 = '0x1a44076050125825900e736c501f859c50fe728c';

  // keccak256("PacketSent(bytes,bytes,address)")
  const PACKET_SENT_TOPIC =
    '0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f';

  const out = [];

  for (const tx of block.transactions || []) {
    for (const log of tx.receipt?.logs || []) {
      // Defensive triple-check: right contract + right topic + log has data.
      // The pipeline filter should already scope this, but public-RPC
      // topic-filtering is unreliable (we hit this on the config-changes
      // pipe), and a miscategorised log here would silently waste rows.
      if ((log.address || '').toLowerCase() !== ENDPOINT_V2) continue;
      if ((log.topics?.[0] || '').toLowerCase() !== PACKET_SENT_TOPIC) continue;
      if (!log.data || log.data.length < 4) continue;

      // log.data is the ABI-encoded `(bytes encodedPayload, bytes options, address sendLibrary)`.
      // Decode it to get encodedPayload (the variable-length packet bytes).
      let encodedPayload;
      let sendLibrary;
      try {
        const [_payload, _options, _lib] = viem.decodeAbiParameters(
          [
            { type: 'bytes', name: 'encodedPayload' },
            { type: 'bytes', name: 'options' },
            { type: 'address', name: 'sendLibrary' },
          ],
          log.data,
        );
        encodedPayload = _payload;
        sendLibrary = _lib;
      } catch (e) {
        // Skip on decode error rather than fail the whole block.
        continue;
      }

      // encodedPayload is a hex string ('0x' + hex bytes). We need at least
      // 113 bytes of header (1+8+4+32+4+32+32). Each byte is 2 hex chars.
      // Hex string length for 113 bytes incl '0x' prefix = 2 + 226 = 228.
      if (!encodedPayload || encodedPayload.length < 228) continue;

      // Slice helpers operate on the hex string. We work in offsets-of-
      // bytes and convert to hex-string offsets by multiplying by 2 and
      // adding 2 for the '0x' prefix.
      const hex = encodedPayload.toLowerCase();
      const slice = (byteOffset, byteLen) => {
        const start = 2 + byteOffset * 2;
        return '0x' + hex.slice(start, start + byteLen * 2);
      };

      // version (1 byte) — should always be 0x01 for V2; skip otherwise
      // because future versions may change the encoding entirely.
      const version = parseInt(slice(0, 1).slice(2), 16);
      if (version !== 1) continue;

      const nonce = BigInt(slice(1, 8)).toString();
      const srcEid = parseInt(slice(9, 4).slice(2), 16);
      // sender is bytes32 with the EVM address in the LAST 20 bytes
      // (left-padded with zeros). On non-EVM source chains the entire
      // 32 bytes encode a different identifier shape, but we're only
      // indexing EVM mainnet here so the address slice is correct.
      const senderBytes32 = slice(13, 32);
      const sender = '0x' + senderBytes32.slice(2 + 24); // last 20 bytes
      const dstEid = parseInt(slice(45, 4).slice(2), 16);
      const receiverBytes32 = slice(49, 32);
      const guid = slice(81, 32);

      // Message bytes start at offset 113. We don't store the message
      // itself (size + variability would balloon the table); just its
      // length, which is a useful proxy for tx-payload weight.
      const messageHexLen = hex.length - (2 + 113 * 2);
      const messageSize = messageHexLen > 0 ? messageHexLen / 2 : 0;

      out.push({
        chain: (block._network || '').toLowerCase(),
        block: Number(block.number),
        block_timestamp: new Date(
          Number(BigInt(block.timestamp || '0x0')) * 1000,
        ).toISOString(),
        tx_hash: tx.hash,
        log_index: log.logIndex,
        contract_address: ENDPOINT_V2, // matches filter post-filter key
        oapp: sender.toLowerCase(),
        src_eid: srcEid,
        dst_eid: dstEid,
        nonce,
        guid,
        receiver_bytes32: receiverBytes32,
        send_library: (sendLibrary || '').toLowerCase(),
        message_size: messageSize,
      });
    }
  }

  return out;
}
