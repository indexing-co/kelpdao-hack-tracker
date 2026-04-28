# Pipe: arbitrum-frozen-wallet-flows

Indexes native ETH movement on Arbitrum One for the KelpDAO recovery's critical wallets.

## Watched addresses

| Address | Label | Headline |
|---|---|---|
| `0x0000000000000000000000000000000000000DA0` | Arbitrum: Intermediary Frozen Wallet | **yes** — outflow = recovery moved |
| `0x5d3919F12bCc35c26Eee5F8226A9bee90c257Ccc` | KelpDAO Exploiter 1 (Arbitrum) | no |
| `0xf228130ce4fAB082C7D5522c90833cec83A9C15e` | Recovery 2-of-3 Safe (per AIP) | no |

## Why native ETH

These addresses move ETH directly (no token contract), so we can't rely on log-level
`Transfer` events. The transformation iterates `block.transactions` and matches on
`tx.from` / `tx.to`.

## Schema

Output rows go to the `wallet_flows` table. See [`db/schema.sql`](../../db/schema.sql).

## Files

- `transform.js` — the JS transformation, deployed at Indexing Co as
  transformation name `arbitrum-frozen-wallet-flows`
- `pipeline.json` — the pipeline config (filter, filterKeys, networks, delivery)

## Pipeline config

- **Filter**: `kelpdao-frozen-wallets` (the 3 watched addresses, lowercase)
- **filterKeys**: `["from_address", "to_address"]` — post-filters the records
  the transform emits
- **allowUnsafeBeats**: `true` — required because native ETH transfers don't
  emit logs, so default log-level pre-filter would reject every block
- **Networks**: `["arbitrum"]`
- **Delivery**: Postgres → `wallet_flows` table, unique on
  `(chain, transaction_hash, log_index, watched_address, direction)`

## Critical Neon gotcha

**Use the *unpooled* Neon endpoint** (without `-pooler` in the host) for the
`connectionUri`. Indexing Co's Postgres adapter silently fails against the pooled
endpoint — connections succeed but writes never land. Webhook delivery works fine
either way; only Postgres has this issue.

In `.env`, the unpooled URL is `DATABASE_URL_DIRECT`. Use that for the pipeline.
Keep `DATABASE_URL` (pooled) for local `psql` / migrations / app reads.

## Deploy

```bash
source ~/.indexing-co/credentials
source .env

# 1. Create / update filter
curl 'https://app.indexing.co/dw/filters/kelpdao-frozen-wallets' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"values":["0x0000000000000000000000000000000000000da0","0x5d3919f12bcc35c26eee5f8226a9bee90c257ccc","0xf228130ce4fab082c7d5522c90833cec83a9c15e"]}'

# 2. Register / update transformation
curl 'https://app.indexing.co/dw/transformations/arbitrum-frozen-wallet-flows' \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/arbitrum-frozen-wallet-flows/transform.js'

# 3. Deploy pipeline (delete-and-recreate to update settings)
curl -X DELETE 'https://app.indexing.co/dw/pipelines/arbitrum-frozen-wallet-flows' \
  -H "X-API-KEY: $API_KEY"
curl 'https://app.indexing.co/dw/pipelines/' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d @pipes/arbitrum-frozen-wallet-flows/pipeline.json
```

## Backfill

```bash
# The freeze tx (April 21, 2026)
curl -X POST 'https://app.indexing.co/dw/pipelines/arbitrum-frozen-wallet-flows/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"network":"arbitrum","value":"0x0000000000000000000000000000000000000da0","beats":[454686044]}'

# A range from a few blocks before the freeze through head
curl -X POST 'https://app.indexing.co/dw/pipelines/arbitrum-frozen-wallet-flows/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"network":"arbitrum","value":"0x0000000000000000000000000000000000000da0","beatStart":454685000,"beatEnd":454686044}'
```

## Verify

```bash
psql "$DATABASE_URL" -c "SELECT chain, block, watched_address, direction, amount_wei, is_headline FROM wallet_flows ORDER BY block DESC LIMIT 10;"
```

## Test transform locally

```bash
curl "https://app.indexing.co/dw/transformations/test?network=arbitrum&beat=454686044&filter=kelpdao-frozen-wallets&filterKeys%5B0%5D=from_address&filterKeys%5B1%5D=to_address" \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/arbitrum-frozen-wallet-flows/transform.js' | python3 -m json.tool
```

Expected: 2 records on the freeze block (one `out`, one `in`).
