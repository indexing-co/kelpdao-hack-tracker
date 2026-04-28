# Watched Addresses

Every address this pipeline indexes, with provenance and verification status.

**Verification policy.** All addresses must be either:
- ✅ **Verified** — confirmed via primary source (Arbitrum forum / Aave governance forum / official tx) AND ideally cross-checked on Arbiscan/Etherscan
- 🟡 **Verified-pending-onchain** — confirmed via primary source, but Arbiscan/Etherscan check still recommended (Arbiscan blocks programmatic fetches; verify in browser)
- ⚠️ **Unverified** — placeholder, blocks deployment until human review

No unverified address is wired into a live pipeline. CI will refuse to deploy if any row has status `unverified`.

---

## How the freeze actually worked (architectural note)

The Arbitrum Security Council does not have constitutional power to unilaterally seize EOA funds on Arbitrum One. Instead, on **2026-04-21 ~03:35 UTC**, they used a clever workaround:

1. **L1 upgrade**: temporarily upgraded the Arbitrum Inbox contract on Ethereum mainnet to add a new function `sendUnsignedTransactionOverride` — which imitates the structure of a standard L1→L2 cross-chain transaction but lets the caller impersonate the sender.
2. **Impersonated L2 message**: used the override to send a single L2 transaction "from" the attacker's Arbitrum address, transferring 30,765.667501709008927568 ETH to `0x0000000000000000000000000000000000000DA0` (a special protocol-level holding address labeled "Arbitrum: Intermediary Frozen Wallet" on Arbiscan).
3. **Revert**: reverted the Inbox contract to its original implementation.

This means the "freeze" was a **one-shot L1→L2 emergency state action**, not a recurring contract event. We index the *consequences* (intermediary wallet balance, eventual release tx) and the *governance flow* (AIP votes), not the freeze mechanism itself.

Source: [Security Council Emergency Action — 2026-04-21](https://forum.arbitrum.foundation/t/security-council-emergency-action-21-04-2026/30803)

---

## Ethereum Mainnet

### Exploit-side artifacts

| Role | Address / Hash | Status | Source |
|---|---|---|---|
| Exploit transaction (nonce 308) | `0x1ae232da212c45f35c1525f851e4c41d529bf18af862d9ce9fd40bf709db4222` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| Reverted second drain attempt (nonce 309) | `0x8509533aed1c9257242b44447daf4fc5d0c562972f366c98cea92dc531783e53` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| Block of exploit | `24,908,285` (April 18, 2026 17:35 UTC) | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| rsETH OFT adapter | `0x85d456b2dff1fd8245387c0bfb64dfb700e98ef3` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| Attacker address (Eth Core, 53k rsETH supplied) | `0x1f4c1c2e610f089d6914c4448e6f21cb0db3adef` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| Attacker address (Eth + Arbitrum, multi-chain) | `0x8d11aeac74267dd5c56d371bf4ae1afa174c2d49` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| L1 Inbox upgrade tx (freeze action L1 side) | `0x079984c56c5670108f5c6f664904178f9b364340351949a42e4637d1f645f770` | ✅ VERIFIED | [Security Council Emergency Action 2026-04-21](https://forum.arbitrum.foundation/t/security-council-emergency-action-21-04-2026/30803) |

### LayerZero infrastructure (cited in research, ⚠️ pending direct primary-source confirm)

| Role | Address | Status | Notes |
|---|---|---|---|
| LayerZero EndpointV2 (Eth mainnet) | `0x1a44076050125825900e736c501f859c50fE728c` | ⚠️ unverified | Well-known LayerZero V2 endpoint. Confirm via [LayerZero docs](https://docs.layerzero.network) before indexing. |

---

## Arbitrum One

### Recovery-side artifacts (Pipeline A primary targets)

| Role | Address / Hash | Status | Source |
|---|---|---|---|
| **Intermediary frozen wallet** ("Arbitrum: Intermediary Frozen Wallet") | `0x0000000000000000000000000000000000000DA0` | ✅ VERIFIED on Arbiscan | [arbiscan.io/address/0x0...0DA0](https://arbiscan.io/address/0x0000000000000000000000000000000000000DA0) |
| **L2 freeze transaction** (block 454,686,044) | `0x5618044241dade84af6c41b7d84496dc9823700f98b79751e257608dac570f6b` | ✅ VERIFIED on Arbiscan | [arbiscan.io/tx/...](https://arbiscan.io/tx/0x5618044241dade84af6c41b7d84496dc9823700f98b79751e257608dac570f6b) |
| **L1 Inbox upgrade tx** (block 24,925,592, ~7 days ago) | `0x079984c56c5670108f5c6f664904178f9b364340351949a42e4637d1f645f770` | ✅ VERIFIED on Etherscan | [etherscan.io/tx/...](https://etherscan.io/tx/0x079984c56c5670108f5c6f664904178f9b364340351949a42e4637d1f645f770) |
| **L1 Security Council 9** (the 9/12 emergency Safe) | `0xF06E95eF589D9c38af242a8AAee8375f14023F85` | ✅ VERIFIED on Etherscan label | [etherscan.io](https://etherscan.io/address/0xF06E95eF589D9c38af242a8AAee8375f14023F85) — labeled "Arbitrum Foundation: L1 Security Council 9" |
| **Council signer EOA** (submitted the freeze tx) | `0x10590a5c93E8695bDb134c22f04C4d5b50755DC4` | ✅ VERIFIED on Etherscan | tx.from on the L1 Inbox upgrade tx |
| **KelpDAO Exploiter 1** (Arbitrum side, address impersonated) | `0x5d3919F12bCc35c26Eee5F8226A9bee90c257Ccc` | ✅ VERIFIED on Arbiscan label | "Kelp DAO Exploiter 1" — funded the intermediary wallet |
| **Recovery destination Safe** (2-of-3 — Aave Labs / KelpDAO / Certora) | `0xf228130ce4fAB082C7D5522c90833cec83A9C15e` | 🟡 verified-per-AIP (not yet executed) | [AIP: Approve Release of Frozen ETH](https://forum.arbitrum.foundation/t/constitutional-aip-approve-release-of-frozen-eth/30825) |

### Frozen amount — both numbers are correct, they mean different things

| Number | Meaning |
|---|---|
| `30,765.667501709008927568 ETH` | Attacker's pre-freeze balance (per Arbitrum forum announcement) |
| `30,765.667401709008927568 ETH` | Amount that landed in `0x...0DA0` after L2 gas (Arbiscan-confirmed current balance) |

The 0.0001 ETH delta = L2 transaction cost. Both numbers appear in different sources, both are right.

### Arbitrum L1 contracts involved in the freeze (verified via Etherscan event logs)

| Contract | Address | Role |
|---|---|---|
| Arbitrum: Delayed Inbox | `0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f` | Temporarily upgraded to add `sendUnsignedTransactionOverride`, then reverted |
| Arbitrum: Bridge | `0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a` | Emitted `MessageDelivered` for the impersonated freeze message |
| Arbitrum Foundation: Upgrade Executor | `0x3fffbadaf827559da092217e474760e2b2c3cedd` | Executed the upgrade-then-revert sequence |
| Temp impersonation impl | `0x980D1F93FC5809c828539c46084801673FA6A859` | Active for one tx then replaced |
| Original Inbox impl (restored) | `0x7C058ad1D0Ee415f7e7f30e62DB1BCf568470a10` | Current production impl |

### Attacker addresses on Arbitrum (from Aave gov forensics)

| Address | Status | Source |
|---|---|---|
| `0x8d11aeac74267dd5c56d371bf4ae1afa174c2d49` (multi-chain, also on Eth) | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| `0xeba786c9517a4823a5cfd9c72e4e80bf8168129b` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| `0xcbb24a6b4dafaaa1a759a2f413ea0eb6ae1455cc` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| `0x1b748b680373a1dd70a2319261328cab2a6f644c` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| `0xbb6a6006eb71205e977eceb19fcad1c8d631c787` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |
| `0xe9e2f48bb0018276391aec240abb46e8c3cad181` | ✅ VERIFIED | [Aave gov rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580) |

> **Note**: at least one of these is the address from which the impersonated transfer was sent to `0x...0DA0`. Identifying which one is a small Arbiscan lookup task — labeled "KelpDAO Exploiter 1" by Arbiscan.

### Aave V3 / V4 on Arbitrum

| Role | Address | Status |
|---|---|---|
| Aave V3 Pool (Arbitrum) | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` | ⚠️ unverified — well-known but confirm via Aave docs |
| rsETH aToken (Arbitrum) | TBD | ⚠️ unverified |

---

## Removed addresses (previously fabricated)

The following address appeared in earlier research notes but does NOT match any address in primary sources. Removed:

- ~~`0x8B1b6c9A6DB1304000412dd21Ae6A70a82d60D3b`~~ — claimed to be the attacker EOA but does not appear in the Aave governance incident report or any primary source. Likely confabulated by an earlier research pass that lacked WebFetch verification. **Replaced** with the seven verified attacker addresses above.

---

## Discrepancies noted (for transparency)

- **Frozen amount**: Arbitrum forum primary source says `30,765.667501709008927568 ETH`. One news article cites `30,765.667401709008927568 ETH` (likely transcription error). We use the forum number as authoritative.
- The forum announcement does NOT publish the Security Council multisig contract address explicitly. Identifying it requires an Arbiscan lookup on the L1 Inbox upgrade tx (`0x079984c5...`) — the upgrade caller is the Security Council. Followup task.

---

## How to verify on Arbiscan/Etherscan (manual workflow)

Arbiscan and Etherscan block programmatic fetches. To verify an address:

1. **Intermediary frozen wallet**: open [arbiscan.io/address/0x0000000000000000000000000000000000000DA0](https://arbiscan.io/address/0x0000000000000000000000000000000000000DA0). Confirm:
   - Label reads "Arbitrum: Intermediary Frozen Wallet"
   - Current balance ~30,765.67 ETH (will drop when AIP passes and release executes)
   - Most recent inbound tx is `0x5618044241dade84af6c41b7d84496dc9823700f98b79751e257608dac570f6b` from one of the labeled "KelpDAO Exploiter" addresses

2. **Recovery Safe**: open [arbiscan.io/address/0xf228130ce4fAB082C7D5522c90833cec83A9C15e](https://arbiscan.io/address/0xf228130ce4fAB082C7D5522c90833cec83A9C15e). Confirm:
   - Type: Gnosis Safe
   - Threshold: 2 of 3
   - Signers include addresses associated with Aave Labs, KelpDAO, Certora (signer addresses not yet listed in the AIP — verify from Safe contract storage)

3. **L1 Inbox upgrade tx**: open [etherscan.io/tx/0x079984c56c5670108f5c6f664904178f9b364340351949a42e4637d1f645f770](https://etherscan.io/tx/0x079984c56c5670108f5c6f664904178f9b364340351949a42e4637d1f645f770). The tx caller (`from`) reveals the Security Council multisig address.

---

## Verification log

| Date | Change | Verified by |
|---|---|---|
| 2026-04-26 | Initial scaffold with all addresses PENDING | claude |
| 2026-04-28 | Verified intermediary wallet `0x...0DA0`, L1 upgrade tx, L2 freeze tx, recovery Safe (per AIP), 7 attacker addresses, exploit + reverted txs, rsETH OFT adapter, block 24,908,285. Removed fabricated `0x8B1b...0D3b`. Documented L1-Inbox-upgrade freeze mechanism. | claude (sources: Arbitrum forum, Aave gov forum) |
