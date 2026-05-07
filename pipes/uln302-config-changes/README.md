# Pipe: uln302-config-changes

Indexes every `UlnConfigSet` event from the LayerZero V2 ULN302 send + receive libraries on Ethereum mainnet. Each event is one OApp's per-route DVN configuration changing on-chain.

The C2/C3 dashboard story leans on these events: the rsETH OFT manually downgraded from a multi-DVN default to 1-of-1 on April 1, 2024 (tx `0x7485c16c...`), then hardened to 4-of-4 across 25 chains on April 23, 2026 (tx `0xbf09fd7d...`). Once this pipe backfills history, the dashboard's DVN monitor tab can render the full timeline for any OApp on LayerZero V2 — auto-discovered, not registry-driven.

## Configuration

| Component | Value |
|---|---|
| Filter name | `kelpdao_uln302_mainnet` |
| Filter values | `0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1` (ULN302 send), `0xc02Ab410f0734EFa3F14628780e6e695156024C2` (ULN302 receive) |
| Network | `ethereum` |
| Transformation | [transform.js](transform.js) — decodes `UlnConfigSet` directly with `viem.decodeAbiParameters` (the helper `evmDecodeLogWithMetadata` doesn't accept inline tuples) |
| Destination | Neon Postgres unpooled (`DATABASE_URL_DIRECT`) → `oapp_uln_config_changes` |
| `uniqueKeys` | `["chain", "tx_hash", "log_index"]` |
| `filterKeys` | `["contract_address"]` (post-filter on the row's log emitter) |

## Schema

[schema.sql](schema.sql) — one row per `(chain, tx_hash, log_index)` with the decoded `UlnConfig`.

## Test

```bash
source ~/.indexing-co/credentials
curl -sS -X POST "https://app.indexing.co/dw/transformations/test?network=ethereum&beat=24941876&filter=kelpdao_uln302_mainnet&filterKeys%5B0%5D=contract_address" \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/uln302-config-changes/transform.js'
```

Expected: 25 rows from the Kelp hardening tx (tx `0xbf09fd7d...`, block 24,941,876). Each row decodes a different destination route flipping from 1-of-1 to 4-of-4.

Verified working as of 2026-05-06.

## Backfill

```bash
# Last 90 days (~648K blocks): mainnet ULN302 send + receive
curl -sS -X POST 'https://app.indexing.co/dw/pipelines/uln302-config-changes/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"network":"ethereum","value":"0xbb2ea70c9e858123480642cf96acbcce1372dce1","beatStart":24387569,"beatEnd":25035569}'

curl -sS -X POST 'https://app.indexing.co/dw/pipelines/uln302-config-changes/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"network":"ethereum","value":"0xc02ab410f0734efa3f14628780e6e695156024c2","beatStart":24387569,"beatEnd":25035569}'
```

## Resolved gotchas (2026-05-06)

Took multiple iterations because of two stacked silent failures:

1. **JSONB columns must hold objects, not arrays.** The Indexing Co Postgres adapter silently drops the entire row when a JSONB column receives a JS array of strings. Wrap as `{addresses: [...]}` and dereference with `(required_dvns->'addresses')` in queries. Documented in [Cortex/knowledge/indexing-co-pipeline-gotchas.md](../../../../Cortex/knowledge/indexing-co-pipeline-gotchas.md) (gotcha #6).

2. **Backfill state survives across transform deploys.** When a transform was broken and produced 0 rows for a block, Indexing Co's backfill orchestrator marks that block as "processed" anyway. Subsequent backfill requests for the same block are silently no-ops. Workaround: `DELETE /pipelines/{name}` and recreate with `POST /pipelines` to reset the orchestrator state, then re-trigger.

After both fixes, the Kelp hardening block (24,941,876) yielded the expected 25 rows in ~90 s.

## Operational notes

- **Backfill rate** observed: ~50–100 rows/min for ULN302 send. Full 90-day backfill across both libs (~1.3M blocks scanned) is multi-hour.
- **`uniqueKeys`** prevents duplicate inserts on retries. Safe to re-trigger backfill ranges.
- **JSONB-array gotcha** is the single sharpest-edged thing here. Test with a populated `required_dvns` value (not just an empty `[]`) before assuming the pipe works.
