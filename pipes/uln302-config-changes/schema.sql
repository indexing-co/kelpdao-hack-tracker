-- Destination table for the ULN302 UlnConfigSet pipe.
-- One row per (chain, tx_hash, log_index) — i.e. every config-change event.
-- Pipeline-level filter post-matches on `contract_address` against the ULN302
-- send + receive library addresses.

CREATE TABLE IF NOT EXISTS oapp_uln_config_changes (
  chain                  TEXT        NOT NULL,
  block                  BIGINT      NOT NULL,
  block_timestamp        TIMESTAMPTZ NOT NULL,
  tx_hash                TEXT        NOT NULL,
  log_index              INTEGER     NOT NULL,
  contract_address       TEXT        NOT NULL,           -- ULN302 send or receive lib (log emitter)
  oapp                   TEXT        NOT NULL,           -- the OApp whose config changed
  dst_eid                INTEGER     NOT NULL,           -- LayerZero EID of the destination chain
  confirmations          TEXT        NOT NULL,           -- uint64 as text (BigInt-safe)
  required_dvn_count     SMALLINT    NOT NULL,
  optional_dvn_count     SMALLINT    NOT NULL,
  optional_dvn_threshold SMALLINT    NOT NULL,
  -- JSONB objects, not arrays. The Indexing Co Postgres adapter silently
  -- drops rows when these columns receive a JS array of strings; objects
  -- work. Wrap as `{addresses: [...]}` in the transform.
  required_dvns          JSONB       NOT NULL,           -- {addresses: [lowercase addresses]}
  optional_dvns          JSONB       NOT NULL,           -- {addresses: [lowercase addresses]}
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS oapp_uln_config_changes_oapp_idx       ON oapp_uln_config_changes (oapp);
CREATE INDEX IF NOT EXISTS oapp_uln_config_changes_oapp_eid_block ON oapp_uln_config_changes (oapp, dst_eid, block DESC);
CREATE INDEX IF NOT EXISTS oapp_uln_config_changes_block_idx      ON oapp_uln_config_changes (block DESC);
