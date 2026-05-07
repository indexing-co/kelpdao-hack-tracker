# layerzero-v2-packets-sent

Indexes every `PacketSent` event emitted by `EndpointV2` (LayerZero V2). One row per cross-chain message sent on the source side. Companion to the existing `uln302-config-changes` pipe — that one tells us the DVN configuration of an OApp at any block; this one tells us how much actual message volume flowed through that configuration.

**Status: configured but NOT deployed.** This branch ships the spec for review (Brock). Nothing has been pushed to Indexing Co. No backfill has been triggered. No rows in Neon yet.

## What it answers

Cross-table queries against `oapp_packets_sent` + `oapp_uln_config_changes` answer:

- **% of LayerZero V2 messages on mainnet sent by OApps with LayerZero Labs as a required DVN** — KelpDAO's central post-hack claim was "~90% of LayerZero messages used the LayerZero Labs DVN in their configuration." This is the data needed to verify that.
- **Which 1-of-1-DVN OApps actually have meaningful volume** — vs the long tail of test deployments. This is the missing filter for the dashboard's monitor tab.
- **Per-OApp message volume over time** — basic but currently unanswered for any LZ V2 OApp without LayerZero Scan.

## Files

| File | Role |
|---|---|
| `transform.js` | Decodes PacketSent + slices the encoded packet header (sender, eids, nonce, guid, message size). Heavily commented; the PacketV1 byte layout is documented at the top. |
| `schema.sql` | `oapp_packets_sent` table + indices |
| `filter.json` | Filter values: just the EndpointV2 mainnet address |
| `pipeline.json` | Filter + transform + Postgres delivery config |

## How to deploy (Brock — when ready)

```bash
# 0. Set creds
source ~/.indexing-co/credentials                   # API_KEY
DATABASE_URL_DIRECT=postgresql://...neon...         # UNPOOLED endpoint

# 1. Apply schema
psql "$DATABASE_URL_DIRECT" -f pipes/layerzero-v2-packets-sent/schema.sql

# 2. Create filter
curl -X POST 'https://app.indexing.co/dw/filters/layerzero-v2-endpoint-mainnet' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d @pipes/layerzero-v2-packets-sent/filter.json

# 3. Register transformation
curl -X POST 'https://app.indexing.co/dw/transformations/layerzero-v2-packets-sent' \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/layerzero-v2-packets-sent/transform.js'

# 4. Test transform on a recent block (any mainnet block has 5+ PacketSent events)
LATEST=$(curl -sS 'https://ethereum-rpc.publicnode.com' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  | python3 -c 'import json,sys; print(int(json.load(sys.stdin)["result"],16))')
curl -X POST "https://app.indexing.co/dw/transformations/test?network=ethereum&beat=$LATEST&filter=layerzero-v2-endpoint-mainnet&filterKeys%5B0%5D=contract_address" \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/layerzero-v2-packets-sent/transform.js'
# Expect: a non-empty array of rows. Inspect one to verify the decode looks right.

# 5. Deploy pipeline (substitutes ${DATABASE_URL_DIRECT})
envsubst < pipes/layerzero-v2-packets-sent/pipeline.json > /tmp/pipeline.json
curl -X POST 'https://app.indexing.co/dw/pipelines/' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d @/tmp/pipeline.json

# 6. Sanity backfill — last 1000 blocks (small)
LATEST=$(...)  # as above
curl -X POST 'https://app.indexing.co/dw/pipelines/layerzero-v2-packets-sent/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d "{\"network\":\"ethereum\",\"value\":\"0x1a44076050125825900e736c501f859c50fE728c\",\"beatStart\":$((LATEST-1000)),\"beatEnd\":$LATEST}"

# 7. Verify rows arrived in Neon
psql "$DATABASE_URL_DIRECT" -c 'SELECT COUNT(*), MIN(block), MAX(block) FROM oapp_packets_sent;'

# 8. ONLY if 6+7 look good: full 90-day backfill
LATEST=$(...)
curl -X POST 'https://app.indexing.co/dw/pipelines/layerzero-v2-packets-sent/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d "{\"network\":\"ethereum\",\"value\":\"0x1a44076050125825900e736c501f859c50fE728c\",\"beatStart\":$((LATEST - 90*7200)),\"beatEnd\":$LATEST}"
```

## Volume + cost expectations

Spot-check from a recent 5,000-block window on mainnet shows roughly **5–15 PacketSent events per block** during normal cross-chain activity. That's in the ballpark of:

| Backfill scope | Expected rows | Backfill runtime (rough) |
|---|---|---|
| Last 1,000 blocks (~3.5 hr) | ~5K–15K | minutes |
| Last 24 hr (~7,200 blocks) | ~36K–108K | tens of minutes |
| Last 90 days (~648K blocks) | ~3.2M–9.7M | hours; possibly many |

**This is meaningfully heavier than the config-changes pipe** (which had ~1,200 rows over 90 days). Brock — please double-check the Indexing Co billing/metering implications before kicking off the 90-day backfill.

## Engineering notes inherited from `uln302-config-changes`

The earlier pipe taught us five gotchas (full writeup at [knowledge/indexing-co-pipeline-gotchas.md](../../../../Cortex/knowledge/indexing-co-pipeline-gotchas.md)). Three are relevant here:

- **Top-level `const` is rejected by the transform sandbox.** All constants must live inside `transform()`. Done.
- **Public RPC topic filters are unreliable.** We re-check `topic[0]` and `log.address` inside the transform. Done.
- **Test endpoint pass ≠ live delivery.** After deploy, always trigger a small backfill and check rows actually arrive in the destination before launching the big one. Steps 6+7 above.

The fifth (JSONB columns must hold objects, not arrays) doesn't apply here — `oapp_packets_sent` has no array fields. The fourth (Neon pooled endpoint silently drops writes) is enforced by `pipeline.json` using `${DATABASE_URL_DIRECT}` — make sure that env var resolves to the unpooled endpoint.

## Open questions for Brock

1. **Volume billing.** I haven't run the numbers against current Indexing Co metering. Please sanity-check before the 90-day backfill.
2. **Network expansion.** Mainnet only here. The same EndpointV2 address works on every chain LayerZero V2 supports, but L2 backfills will be much heavier. Worth doing one chain at a time.
3. **Receiver decoding.** I store `receiver_bytes32` as the full 32-byte hex. EVM destinations have the address in the last 20 bytes; non-EVM destinations encode something else. The dashboard can derive the EVM-address slice when rendering. Acceptable, or do you want the column split into a typed `receiver_address` for EVM destinations only?
4. **Message body.** I store `message_size` (bytes) but not the message itself. Storage cost was the reason; if there's a clear use case for keeping the full payload (per-OFT amount tracking, e.g.) we can add a separate column or a separate pipe. My instinct: separate pipe per OApp standard.

## Composability with `uln302-config-changes`

The reason this pipe matters is the cross-table join. The shape of the dashboard query that answers KelpDAO's "~90%" claim:

```sql
-- For every PacketSent in the window, find the LATEST UlnConfigSet for
-- that (oapp, dst_eid) before the packet's block. Aggregate by whether
-- the resulting required_dvns include LayerZero Labs.
WITH packet_with_config AS (
  SELECT
    p.tx_hash,
    p.block,
    p.oapp,
    p.dst_eid,
    (
      SELECT c.required_dvns->'addresses'
      FROM oapp_uln_config_changes c
      WHERE c.oapp = p.oapp AND c.dst_eid = p.dst_eid AND c.block <= p.block
      ORDER BY c.block DESC, c.log_index DESC
      LIMIT 1
    ) AS active_dvns
  FROM oapp_packets_sent p
  WHERE p.block_timestamp > NOW() - INTERVAL '90 days'
)
SELECT
  COUNT(*) FILTER (
    WHERE active_dvns @> '["0x589dedbd617e0cbcb916a9223f4d1300c294236b"]'::jsonb
  )::float / NULLIF(COUNT(*), 0) AS pct_using_lz_labs_dvn
FROM packet_with_config
WHERE active_dvns IS NOT NULL;
```

That's the answer-to-the-headline-question query, once both pipes are populated.
