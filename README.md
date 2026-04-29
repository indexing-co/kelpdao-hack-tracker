# KelpDAO Hack Tracker

Open-source pipeline + public dashboard tracking the on-chain recovery of the **April 18, 2026 KelpDAO exploit** ($292M drained via a forged LayerZero cross-chain message).

> Live dashboard: [observatory.indexing.co/kelpdao-recovery](https://observatory.indexing.co/kelpdao-recovery)

---

## What this tracks

- **The 30,766 ETH frozen on Arbitrum** by the Arbitrum Security Council on April 20, 2026
- Every signature on the Security Council multisig
- Every movement on the intermediary wallet holding the frozen funds
- Active Arbitrum + Aave + Mantle + Lido governance proposals tied to the recovery
- The DeFi United bailout — contributions arriving from Aave, KelpDAO, Lido, EtherFi, Stani Kulechov, Mantle, Golem Foundation, Ink Foundation, and others

## Why we built it

The data is public, but no one is stitching it together. ZachXBT, PeckShield, and Arkham track pieces in real time on Telegram and X — there's no queryable, persistent, cross-protocol view that survives the news cycle. So we built one.

This is also a working demo of [Indexing Co](https://indexing.co)'s blockchain data pipelines.

## Stack

| Layer | Tech |
|---|---|
| Indexing | [Indexing Co Pipes](https://indexing.co) (event listeners + transformation functions) |
| Database | Neon Postgres (serverless, branched per pipeline) |
| Frontend | Next.js 15 + Vercel |
| Charts | [`indexing-co/Charting-Library`](https://github.com/indexing-co/Charting-Library) |
| Contracts | Arbitrum Security Council multisig + intermediary wallet |

## Repo structure

```
.
├── pipes/         # Indexing Co pipe definitions + transform functions
├── db/            # Neon schema + migrations
├── dashboard/     # Next.js frontend
└── docs/          # Pipeline architecture, content notes
```

*Structure populated as the build progresses.*

## Run locally

*Setup instructions arriving with the first pipe commit.*

## Want this for your protocol?

We index onchain data for a living. If you want:

- Real-time webhooks/alerts on this data
- A custom dashboard for your own protocol
- Help building cross-chain forensics or invariant monitoring

→ **[indexing.co/contact](https://indexing.co/contact)**

## License

MIT — see [LICENSE](./LICENSE).

## Built by

[Indexing Co](https://indexing.co) — the data layer for onchain protocols.
