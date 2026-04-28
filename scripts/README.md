# Scripts

Off-chain pollers and one-off utilities. Indexing Co pipelines handle on-chain data; these scripts handle off-chain sources (Snapshot, forum) and ad-hoc tasks.

## sync-snapshot.mjs

Polls Snapshot for proposals matching recovery keywords across the DAOs involved (Arbitrum, Aave, KelpDAO, EtherFi, Mantle, Lido, Compound) and upserts them into the `governance_proposals` table.

```bash
node scripts/sync-snapshot.mjs
```

Idempotent. Designed to run on a cron (e.g. every 5 minutes via Render cron job, Vercel cron, or GitHub Actions).

### Expected output

```
✓ [etherfi-dao.eth] closed  ether.fi DAO Proposal: Treasury Contribution to restore rsETH's backing

Fetched 50 proposals across 7 spaces.
1 matched recovery keywords. 1 upserted.
```

### Keywords that trigger relevance

`rseth`, `kelpdao`, `kelp dao`, `kelp `, `frozen eth`, `rseth incident`, `rseth recovery`, `restore rseth`, `defi united`

Add new keywords in `KEYWORDS` if a relevant proposal slips through.

### Schedule recommendation

5-minute cadence is enough — Snapshot proposals don't change vote tallies more often than that meaningfully. Run hourly during quiet periods, every 5 minutes when an active vote is open.
