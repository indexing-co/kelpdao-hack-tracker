# Pipe: ethereum-arbitrum-freeze-events

Decodes events from the **Arbitrum L1 contracts** that constitute a "freeze action" — i.e. an emergency Inbox upgrade that lets the Security Council impersonate any sender on a single L1→L2 message.

## Watched contracts

| Address | Label |
|---|---|
| `0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f` | Arbitrum: Delayed Inbox |
| `0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a` | Arbitrum: Bridge |
| `0x3fffbadaf827559da092217e474760e2b2c3cedd` | Arbitrum Foundation: Upgrade Executor |

## Why this matters

The historical KelpDAO freeze (L1 tx `0x079984c5...f770`, block 24,925,592) emitted exactly 5 events from these contracts:

1. `Delayed Inbox.Upgraded` → `nextVersion = 0x980D1F...A859` (impersonation impl)
2. `Bridge.MessageDelivered` → `sender = 0x5d3919F1...7Ccc` (KelpDAO Exploiter 1, impersonated)
3. `Delayed Inbox.InboxMessageDelivered` → payload contains `0x...0DA0` destination
4. `Delayed Inbox.Upgraded` → `nextVersion = 0x7C058a...0a10` (restoring original impl)
5. `Upgrade Executor.UpgradeExecuted`

Any future emergency action through this mechanism will produce the same fingerprint.

## Decoded events

```
event Upgraded(address indexed nextVersion)
event MessageDelivered(uint256 indexed messageIndex, bytes32 indexed beforeInboxAcc, address inbox, uint8 kind, address sender, bytes32 messageDataHash, uint256 baseFeeL1, uint64 timestamp)
event InboxMessageDelivered(uint256 indexed messageNum, bytes data)
event UpgradeExecuted(address indexed upgrade, uint256 value, bytes data)
```

## Pipeline config

- **Filter**: `arbitrum-l1-freeze-contracts` (3 lowercase addresses)
- **filterKeys**: `["contract_address"]`
- **Networks**: `["ethereum"]`
- **Delivery**: Postgres (unpooled Neon endpoint) → `arbitrum_freeze_events` table

## Note on `MessageDelivered` volume

The `Bridge.MessageDelivered` event fires on **every** L1→L2 message, not just emergency actions. So this pipe will produce a steady stream of legitimate L1→L2 messages, with the freeze events being a tiny anomalous subset. Filter by `event_name='Upgraded'` AND `contract_label='Arbitrum: Delayed Inbox'` (paired) to find emergency actions specifically.

## Test

```bash
curl "https://app.indexing.co/dw/transformations/test?network=ethereum&beat=24925592&filter=arbitrum-l1-freeze-contracts&filterKeys%5B0%5D=contract_address" \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/ethereum-arbitrum-freeze-events/transform.js' | python3 -m json.tool
```

Expected: 5 records covering the full freeze fingerprint.

## Backfill

```bash
curl -X POST 'https://app.indexing.co/dw/pipelines/ethereum-arbitrum-freeze-events/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"network":"ethereum","value":"0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f","beats":[24925592]}'
```
