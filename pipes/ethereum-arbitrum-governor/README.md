# Pipe: arbitrum-governor (NOT YET DEPLOYED)

Will index `ProposalCreated`, `VoteCast`, `ProposalQueued`, `ProposalExecuted`, and `ProposalCanceled` events on the Arbitrum DAO governors. Once the Constitutional AIP for the frozen ETH release moves from forum/Snapshot to on-chain voting, this pipe will surface the live tally.

## Why this isn't running yet

Per the [AIP timeline](https://forum.arbitrum.foundation/t/constitutional-aip-approve-release-of-frozen-eth/30825), the on-chain vote opens approximately **May 12-26, 2026** (after 1w forum + 1w temperature check + 3d voting delay). Until then, no on-chain proposal exists for this pipe to capture.

The dashboard currently shows the AIP via a manually-seeded `forum` row plus the EtherFi Snapshot proposal indexed via the Snapshot poller.

## Watched contracts (PENDING address verification)

The Arbitrum DAO has two governors and one constitution-level mechanism:

| Role | Network | Address | Status |
|---|---|---|---|
| Arbitrum Core Governor (constitutional) | Arbitrum One | TBD | ⚠️ PENDING — verify via [docs.arbitrum.foundation](https://docs.arbitrum.foundation/dao-constitution) before deploying |
| Arbitrum Treasury Governor | Arbitrum One | TBD | ⚠️ PENDING |
| Arbitrum L1 Governance Timelock | Ethereum | TBD | ⚠️ PENDING |

Update [`docs/addresses.md`](../../docs/addresses.md) with verified addresses before deploying this pipe.

## Pipeline shape (planned)

- **Filter**: `arbitrum-governors` with the verified governor addresses
- **filterKeys**: `["contract_address"]`
- **Networks**: `["arbitrum"]` (Core + Treasury) — possibly also `["ethereum"]` if the L1 timelock fires events worth indexing
- **Delivery**: Postgres → both `governance_proposals` (lifecycle events) and `governance_votes` (individual votes)

## Decoded events

```
event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)
event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)
event VoteCastWithParams(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason, bytes params)
event ProposalQueued(uint256 proposalId, uint256 etaSeconds)
event ProposalExecuted(uint256 proposalId)
event ProposalCanceled(uint256 proposalId)
```

## Deploy steps (when ready)

1. Verify Arbitrum governor addresses → update `docs/addresses.md` (PENDING → VERIFIED)
2. Write `transform.js` in this directory (template available in `src/constants.ts` GOVERNOR_EVENTS)
3. Create filter `arbitrum-governors` with verified addresses
4. Register transformation
5. Deploy pipeline pointing at `governance_proposals` (or split into two pipes for proposals vs. votes)
6. Backfill from a recent block to head
