-- KelpDAO Hack Tracker — Neon Postgres schema
-- Run with: psql "$DATABASE_URL" -f db/schema.sql

-- ============================================================================
-- wallet_flows: native ETH + ERC-20 movements for watched addresses
-- ============================================================================
-- One row per (chain, tx, watched_address, direction). The same tx can
-- generate two rows if both `from` and `to` are watched (rare but possible).

CREATE TABLE IF NOT EXISTS wallet_flows (
  chain             TEXT        NOT NULL,
  block             BIGINT      NOT NULL,
  block_timestamp   TIMESTAMPTZ NOT NULL,
  transaction_hash  TEXT        NOT NULL,
  log_index         INTEGER     NOT NULL DEFAULT -1,         -- -1 = native ETH (no log)
  from_address      TEXT        NOT NULL,
  to_address        TEXT        NOT NULL,
  token_address     TEXT,                                    -- NULL = native ETH
  amount_wei        NUMERIC(78, 0) NOT NULL,                 -- uint256 max fits
  direction         TEXT        NOT NULL CHECK (direction IN ('in', 'out')),
  watched_address   TEXT        NOT NULL,
  is_headline       BOOLEAN     NOT NULL DEFAULT FALSE,      -- intermediary frozen wallet movement => true
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, transaction_hash, log_index, watched_address, direction)
);

CREATE INDEX IF NOT EXISTS idx_wallet_flows_watched_block ON wallet_flows (watched_address, block DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_flows_headline_block ON wallet_flows (is_headline, block DESC) WHERE is_headline = TRUE;

-- ============================================================================
-- multisig_events: Gnosis Safe events for watched multisigs
-- ============================================================================
-- Includes the L1 Security Council 9, the recovery 2-of-3 Safe, etc.

CREATE TABLE IF NOT EXISTS multisig_events (
  chain             TEXT        NOT NULL,
  block             BIGINT      NOT NULL,
  block_timestamp   TIMESTAMPTZ NOT NULL,
  transaction_hash  TEXT        NOT NULL,
  log_index         INTEGER     NOT NULL,
  multisig_address  TEXT        NOT NULL,
  event_name        TEXT        NOT NULL,
  decoded           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_multisig_events_address_block ON multisig_events (multisig_address, block DESC);

-- ============================================================================
-- arbitrum_freeze_events: L1 contract events that constitute the freeze action
-- ============================================================================
-- Captures Inbox.Upgraded, Bridge.MessageDelivered, Inbox.InboxMessageDelivered,
-- UpgradeExecutor.UpgradeExecuted

CREATE TABLE IF NOT EXISTS arbitrum_freeze_events (
  chain             TEXT        NOT NULL,
  block             BIGINT      NOT NULL,
  block_timestamp   TIMESTAMPTZ NOT NULL,
  transaction_hash  TEXT        NOT NULL,
  log_index         INTEGER     NOT NULL,
  contract_address  TEXT        NOT NULL,
  contract_label    TEXT        NOT NULL,                    -- "Delayed Inbox", "Bridge", "Upgrade Executor"
  event_name        TEXT        NOT NULL,
  decoded           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_freeze_events_block ON arbitrum_freeze_events (block DESC);

-- ============================================================================
-- pipeline_metadata: per-pipe state we keep on our side
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_metadata (
  pipe_name         TEXT        PRIMARY KEY,
  last_indexed_block BIGINT,
  last_synced_at    TIMESTAMPTZ,
  notes             TEXT
);
