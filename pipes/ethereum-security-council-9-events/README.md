# Pipe: ethereum-security-council-9-events

Decodes Gnosis Safe events emitted by the **Arbitrum Foundation: L1 Security Council 9** multisig (`0xF06E95eF589D9c38af242a8AAee8375f14023F85`) on Ethereum mainnet.

## Why this matters

Each `ExecutionSuccess` on this Safe is a real-world emergency action. The historical KelpDAO freeze (April 21, 2026) was one of these — Safe-internal txHash `0x1d53ed14...50aa` at L1 block 24,925,592, log 9.

Going forward, every new `ExecutionSuccess` is a Security Council emergency intervention. We want one of those to surface in the dashboard within a block of confirmation.

## Decoded events

```
event ExecutionSuccess(bytes32 txHash, uint256 payment)
event ExecutionFailure(bytes32 txHash, uint256 payment)
event ApproveHash(bytes32 indexed approvedHash, address indexed owner)
event SignMsg(bytes32 indexed msgHash)
event AddedOwner(address owner)
event RemovedOwner(address owner)
event ChangedThreshold(uint256 threshold)
event ExecutionFromModuleSuccess(address indexed module)
event ExecutionFromModuleFailure(address indexed module)
```

## Pipeline config

- **Filter**: `security-council-9` (the Safe address, lowercase)
- **filterKeys**: `["contract_address"]` — both the log-level pre-filter AND the post-filter on transform output
- **Networks**: `["ethereum"]`
- **Delivery**: Postgres (unpooled Neon endpoint) → `multisig_events` table

## Output schema

Records emit `contract_address` (not `multisig_address`) because the filterKey post-filter checks for an exact field-name match on records. Mismatched field name silently drops every row.

## Test

```bash
curl "https://app.indexing.co/dw/transformations/test?network=ethereum&beat=24925592&filter=security-council-9&filterKeys%5B0%5D=contract_address" \
  -H "X-API-KEY: $API_KEY" \
  -F 'code=@pipes/ethereum-security-council-9-events/transform.js' | python3 -m json.tool
```

Expected: 1 record, `event_name: "ExecutionSuccess"`, `decoded.txHash` matches the Safe-internal hash from Etherscan log 9.

## Backfill

```bash
# The historical freeze
curl -X POST 'https://app.indexing.co/dw/pipelines/ethereum-security-council-9-events/backfill' \
  -H "X-API-KEY: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"network":"ethereum","value":"0xf06e95ef589d9c38af242a8aaee8375f14023f85","beats":[24925592]}'
```
