# Event Signatures

Every event signature this pipeline decodes, formatted exactly as Indexing Co's transformation API expects.

**Format**: `event Name(type1 indexed param1, type2 param2, ...)` — the `indexed` keyword must match the contract ABI exactly. Topic0 hash listed where pre-computed.

---

## Gnosis Safe (Security Council multisig)

> ⚠️ **Pending verification** — confirm the Security Council uses Gnosis Safe (likely v1.3 or v1.4) and not a custom multisig contract. Different versions may have slightly different event signatures. Source: Arbiscan "Contract" tab on the multisig address.

### v1.3 / v1.4 events (most likely)

```
event ExecutionSuccess(bytes32 txHash, uint256 payment)
event ExecutionFailure(bytes32 txHash, uint256 payment)
event SignMsg(bytes32 indexed msgHash)
event ApproveHash(bytes32 indexed approvedHash, address indexed owner)
event AddedOwner(address owner)
event RemovedOwner(address owner)
event ChangedThreshold(uint256 threshold)
event ExecutionFromModuleSuccess(address indexed module)
event ExecutionFromModuleFailure(address indexed module)
event SafeReceived(address indexed sender, uint256 value)
event SafeSetup(address indexed initiator, address[] owners, uint256 threshold, address initializer, address fallbackHandler)
```

**Topic0 hashes** (computed from canonical signatures, verify on first decode):

| Event | Topic0 (placeholder, compute via `utils.evmMethodSignatureToHex` at runtime) |
|---|---|
| `ExecutionSuccess` | TBD |
| `ExecutionFailure` | TBD |
| `ApproveHash` | TBD |
| `AddedOwner` | TBD |

**Note for transformation**: when decoding `ExecutionSuccess`, `txHash` is the Safe-internal hash (not the L1/L2 tx hash). To recover the executed call data, look at the tx's input data — the `execTransaction` function call holds `to`, `value`, `data`, `operation`, etc.

---

## ERC-20 Transfer (intermediary wallet, attacker wallet)

```
event Transfer(address indexed from, address indexed to, uint256 value)
```

**Topic0**: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`

**Filter strategy**: filter on `from = WATCHED_WALLET` OR `to = WATCHED_WALLET` inside the transformation. Indexing Co's filter layer matches `contract_address` (the token), so the wallet matching happens in the transformation.

---

## Native ETH transfers (CRITICAL — not a log event)

⚠️ **Native ETH transfers do NOT emit logs.** They are transaction-level data, not log-level. To index ETH movement to/from a wallet:

```javascript
function transform(block) {
  const watched = '0x...'.toLowerCase(); // intermediary wallet
  const results = [];
  for (const tx of block.transactions || []) {
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();
    const value = tx.value; // hex string
    if ((from === watched || to === watched) && BigInt(value) > 0n) {
      results.push({
        chain: block._network,
        block: Number(block.number),
        transaction_hash: tx.hash,
        from_address: from,
        to_address: to,
        token_address: null, // null = native ETH
        amount: BigInt(value).toString(),
        direction: from === watched ? 'out' : 'in',
      });
    }
  }
  return results;
}
```

This means the `wallet_flows` indexing pipe needs to inspect every transaction in every block where the watched address appears as `from` or `to`, not just decoded logs. Indexing Co supports this via the block-level transaction iterator — see [`pipes/wallet-flows/`](../pipes/wallet-flows/) for the full implementation.

---

## Arbitrum Governor

> ⚠️ **Pending verification** — Arbitrum has multiple governance contracts (Core Governor, Treasury Governor, Security Council Manager). Identify which one(s) hold proposals related to the KelpDAO recovery before subscribing.

### Standard OpenZeppelin Governor events

```
event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)
event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)
event VoteCastWithParams(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason, bytes params)
event ProposalQueued(uint256 proposalId, uint256 etaSeconds)
event ProposalExecuted(uint256 proposalId)
event ProposalCanceled(uint256 proposalId)
```

**Note**: Arbitrum's governor is a fork of OpenZeppelin Governor with custom timelocks. Verify event signatures against the deployed bytecode on Arbiscan before deploying the pipe.

### Snapshot (off-chain governance)

Snapshot proposals are NOT on-chain events. They live on IPFS and are queried via the Snapshot API:
- Endpoint: `https://hub.snapshot.org/graphql`
- We poll this separately from the Indexing Co pipe (see [`pipes/governance/snapshot-poller.ts`](../pipes/governance/snapshot-poller.ts)).

---

## How to add a new event signature

1. Find the contract ABI on Arbiscan/Etherscan (Contract tab → "Contract ABI").
2. Find the event entry. Format the signature as `event Name(type1 indexed param1, type2 param2, ...)` — matching `indexed` keywords exactly.
3. Add to this doc under the appropriate section.
4. Add to [`src/constants.ts`](../src/constants.ts) as a typed export.
5. Test the signature by running a dry transformation:
   ```bash
   curl 'https://app.indexing.co/dw/transformations/test?network=arbitrum&beat=BLOCK_NUMBER&filter=YOUR_FILTER&filterKeys[0]=contract_address' \
     -H "X-API-KEY: $INDEXING_CO_API_KEY" \
     -F 'code=@transform.js'
   ```
6. If the test returns decoded data, the signature is correct. Commit.

---

## Reference

- Indexing Co transformation API: [docs.indexing.co](https://docs.indexing.co)
- Arbitrum governance contracts: [docs.arbitrum.foundation/dao-constitution](https://docs.arbitrum.foundation/dao-constitution)
- Gnosis Safe ABIs: [github.com/safe-global/safe-smart-account](https://github.com/safe-global/safe-smart-account)
