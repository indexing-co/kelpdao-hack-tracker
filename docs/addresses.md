# Watched Addresses

Every address this pipeline indexes, with provenance and verification status.

**Verification policy.** All addresses must be either:
- ✅ **Verified** — confirmed on-chain via Arbiscan/Etherscan + at least one secondary source (forum post, official announcement)
- ⚠️ **Unverified** — placeholder, blocks deployment until human review

No unverified address is wired into a live pipeline. CI will refuse to deploy if any row has status `unverified`.

---

## Ethereum Mainnet

### Exploit-side artifacts

| Role | Address | Status | Source | Verified |
|---|---|---|---|---|
| Attacker EOA | `0x8B1b6c9A6DB1304000412dd21Ae6A70a82d60D3b` | ⚠️ unverified | Cited in defiprime forensics + multiple news sources | NEEDS_HUMAN_REVIEW |
| Exploit transaction | `0x1ae232da212c45f35c1525f851e4c41d529bf18af862d9ce9fd40bf709db4222` | ⚠️ unverified | Cited in defiprime forensics | NEEDS_HUMAN_REVIEW |
| LayerZero EndpointV2 | `0x1a44076050125825900e736c501f859c50fE728c` | ⚠️ unverified (well-known LayerZero contract — easy to verify) | LayerZero docs + EIP-2535 deployments | NEEDS_HUMAN_REVIEW |
| rsETH OFT adapter | `0x85d456B2DfF1fd8245387C0BfB64Dfb700e98Ef3` | ⚠️ unverified | Cited in defiprime forensics | NEEDS_HUMAN_REVIEW |

### KelpDAO core (out of scope for Pipeline A, listed for completeness)

| Role | Address | Status |
|---|---|---|
| rsETH ERC-20 | TBD | ⚠️ unverified |
| KelpDAO LRTDepositPool | TBD | ⚠️ unverified |

---

## Arbitrum One

### Recovery-side artifacts (Pipeline A primary targets)

| Role | Address | Status | Source | Verified |
|---|---|---|---|---|
| Arbitrum Security Council (emergency, 9/12) | TBD — `arbitrumDAO/security-council-elections` repo / docs.arbitrum.foundation | ⚠️ unverified | Arbitrum Foundation | NEEDS_HUMAN_REVIEW |
| Arbitrum Security Council (non-emergency, 7/12) | TBD | ⚠️ unverified | Arbitrum Foundation | NEEDS_HUMAN_REVIEW |
| Freeze transaction (~April 20, 2026) | TBD | ⚠️ **CRITICAL — unverified** | Reported in The Defiant. Not yet found on Arbiscan. | NEEDS_HUMAN_REVIEW |
| Intermediary wallet holding 30,766 ETH | TBD | ⚠️ **CRITICAL — unverified** | Reported in The Defiant. Address never published. | NEEDS_HUMAN_REVIEW |
| Attacker Arbitrum address (if different from Eth EOA) | TBD | ⚠️ unverified | Same EOA likely; verify via Aave V3 Arbitrum borrow tx | NEEDS_HUMAN_REVIEW |

### Aave V3 / V4 on Arbitrum

| Role | Address | Status |
|---|---|---|
| Aave V3 Pool (Arbitrum) | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` | ⚠️ unverified (well-known, but needs explicit confirm) |
| rsETH aToken (Arbitrum) | TBD | ⚠️ unverified |

---

## Architectural open question (resolve before indexing freeze events)

**The Arbitrum Security Council does not have a constitutional power to unilaterally seize funds from an EOA on Arbitrum One.** This raises a critical question about what the "freeze" actually was:

| Hypothesis | Implication for what we index |
|---|---|
| **A. Sequencer-level censorship** of attacker txs | We don't index a freeze tx — we index the *absence* of attacker txs being included. Different pipeline shape entirely. |
| **B. Upgrade authorized a sweep** from a contract the attacker had not withdrawn from yet (e.g. Aave aToken position) | We index the upgrade tx + the sweep tx + the destination wallet. Standard pipeline. |
| **C. Funds were trapped in an Arbitrum-native contract** (bridge, message system) and Security Council acted there | We index that contract's emergency action. Need to identify it. |
| **D. Attacker voluntarily moved funds** under negotiation, freeze is a misnomer | We index the attacker's outbound tx + destination. |

**Action required**: source the actual freeze tx hash from a primary source (Arbitrum Foundation tweet, governance forum post, or KelpDAO post-mortem). The tx contents will tell us which hypothesis is correct.

---

## How to verify an address (workflow)

1. Go to Arbiscan (arbiscan.io) or Etherscan (etherscan.io).
2. Paste the address. Confirm:
   - **Contract type** (Gnosis Safe, EOA, Governor, custom) — visible in the "Contract" tab
   - **Activity** matches the role (e.g. Security Council multisig should have multi-sig owner setup, governance txs)
   - **Balance** matches the claimed role (e.g. intermediary wallet should currently hold ~30,766 ETH)
3. Cross-reference with at least one of:
   - Arbitrum Foundation governance forum (forum.arbitrum.foundation)
   - Tally (tally.xyz/gov/arbitrum)
   - KelpDAO post-mortem
   - Aave governance forum (governance.aave.com)
4. Update this doc: change ⚠️ → ✅, add source URL, set "Verified" date.
5. Update [`src/constants.ts`](../src/constants.ts) with the verified address.

---

## Verification log

| Date | Address | Status change | Verified by | Notes |
|---|---|---|---|---|
| 2026-04-26 | (initial scaffold) | placeholder docs | claude | All addresses pending human review |
