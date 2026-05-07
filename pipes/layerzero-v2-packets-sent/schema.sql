-- ============================================================================
-- oapp_packets_sent
-- ============================================================================
--
-- Every PacketSent event emitted by EndpointV2 (LayerZero V2). One row per
-- event keyed by (chain, tx_hash, log_index). Fields decoded by the pipe
-- transform (see transform.js for the packet header layout).
--
-- WHY THIS EXISTS
-- ---------------
-- The DVN config monitor (oapp_uln_config_changes) tells us WHICH OApps had
-- which DVN configurations and WHEN they changed. This table tells us how
-- much actual cross-chain message volume flowed through those configurations.
-- Cross-joining the two answers questions like:
--   - What % of LayerZero V2 messages on mainnet were sent by OApps using
--     LayerZero Labs DVN as a required attestor?
--   - Which 1-of-1-DVN OApps actually have meaningful volume vs are
--     long-abandoned test deployments?
--
-- The first question is the C6 content piece. The second is the filter
-- the dashboard's monitor tab needs to separate "real production OApps"
-- from the long tail of tests.
--
-- VOLUME EXPECTATIONS (mainnet only)
-- ----------------------------------
-- Roughly ~5–15K PacketSent events per day on Ethereum mainnet (from a
-- spot check of recent blocks). 90-day backfill is therefore on the order
-- of 0.5M–1.5M rows. L2 networks are higher.
--
-- COLUMN NOTES
-- ------------
-- - oapp:           lower-cased EVM address; the source-side OApp contract
-- - src_eid/dst_eid: LayerZero endpoint IDs (uint32 per chain)
-- - nonce:          per-(oapp, dst_eid) monotonic; stored as TEXT to avoid
--                   any uint64 overflow surprises in client code
-- - guid:           bytes32 globally-unique message id (hex string)
-- - receiver_bytes32: full 32-byte receiver — NOT truncated to address,
--                   because non-EVM destinations encode receivers
--                   differently. EVM destinations have address in last 20.
-- - send_library:   the send-library address used for this message (e.g.
--                   ULN302). Useful when LayerZero ships new libraries.
-- - message_size:   length in bytes of the variable-length payload, NOT
--                   the payload itself. Cheap proxy for OFT vs control
--                   messages without bloating storage.
--
-- INDICES
-- -------
-- - PRIMARY KEY (chain, tx_hash, log_index): natural uniqueness
-- - (oapp, block DESC): most queries filter by OApp + want recent first
-- - (block DESC): for "recent activity" feeds
-- - (oapp, dst_eid, block DESC): for the temporal join against
--   oapp_uln_config_changes (latest config for an OApp+route up to a given block)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oapp_packets_sent (
  chain              TEXT        NOT NULL,
  block              BIGINT      NOT NULL,
  block_timestamp    TIMESTAMPTZ NOT NULL,
  tx_hash            TEXT        NOT NULL,
  log_index          INTEGER     NOT NULL,
  contract_address   TEXT        NOT NULL,                -- EndpointV2, matches filter
  oapp               TEXT        NOT NULL,                -- source OApp (lowercase address)
  src_eid            INTEGER     NOT NULL,                -- LayerZero source endpoint id
  dst_eid            INTEGER     NOT NULL,                -- LayerZero destination endpoint id
  nonce              TEXT        NOT NULL,                -- uint64 packet nonce, as decimal text
  guid               TEXT        NOT NULL,                -- bytes32 globally-unique message id
  receiver_bytes32   TEXT,                                -- full 32-byte receiver (non-EVM-safe)
  send_library       TEXT,                                -- e.g. ULN302 send-library address
  message_size       INTEGER     NOT NULL DEFAULT 0,      -- bytes; we don't store the payload
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_packets_sent_oapp_block
  ON oapp_packets_sent (oapp, block DESC);

CREATE INDEX IF NOT EXISTS idx_packets_sent_block
  ON oapp_packets_sent (block DESC);

CREATE INDEX IF NOT EXISTS idx_packets_sent_oapp_dst_block
  ON oapp_packets_sent (oapp, dst_eid, block DESC);
