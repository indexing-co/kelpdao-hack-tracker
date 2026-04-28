/**
 * Watched addresses and event signatures for the KelpDAO Hack Tracker.
 *
 * Every entry is one of:
 *   - VERIFIED            — confirmed via primary source (Arbitrum forum,
 *                           Aave governance forum, or executed on-chain tx).
 *   - VERIFIED_PER_AIP    — confirmed in a governance proposal that has not
 *                           yet executed on-chain. Treat as authoritative
 *                           for indexing purposes; flip to VERIFIED once
 *                           on-chain action confirms.
 *   - PENDING             — not confirmed; blocks deployment.
 *
 * Verification policy: see docs/addresses.md
 * Event signatures:    see docs/event-signatures.md
 */

export type VerificationStatus = 'VERIFIED' | 'VERIFIED_PER_AIP' | 'PENDING';

interface WatchedAddress {
  readonly address: `0x${string}` | null;
  readonly status: VerificationStatus;
  readonly source?: string;
  readonly notes?: string;
}

interface VerifiedTxHash {
  readonly hash: `0x${string}` | null;
  readonly status: VerificationStatus;
  readonly chain: 'ethereum' | 'arbitrum';
  readonly source?: string;
  readonly notes?: string;
}

// ============================================================================
// Ethereum Mainnet — exploit-side
// ============================================================================

export const EXPLOIT_TX: VerifiedTxHash = {
  hash: '0x1ae232da212c45f35c1525f851e4c41d529bf18af862d9ce9fd40bf709db4222',
  status: 'VERIFIED',
  chain: 'ethereum',
  source: 'governance.aave.com/t/rseth-incident-report-april-20-2026/24580',
  notes: 'LayerZero packet nonce 308. Block 24,908,285, 2026-04-18 17:35 UTC.',
};

export const REVERTED_SECOND_DRAIN_TX: VerifiedTxHash = {
  hash: '0x8509533aed1c9257242b44447daf4fc5d0c562972f366c98cea92dc531783e53',
  status: 'VERIFIED',
  chain: 'ethereum',
  source: 'governance.aave.com/t/rseth-incident-report-april-20-2026/24580',
  notes: 'LayerZero packet nonce 309 — would have drained another 40,000 rsETH. Reverted by KelpDAO pause.',
};

export const EXPLOIT_BLOCK = 24908285 as const;

export const RSETH_OFT_ADAPTER: WatchedAddress = {
  address: '0x85d456b2dff1fd8245387c0bfb64dfb700e98ef3',
  status: 'VERIFIED',
  source: 'governance.aave.com/t/rseth-incident-report-april-20-2026/24580',
};

export const ATTACKER_ETH_CORE: WatchedAddress = {
  address: '0x1f4c1c2e610f089d6914c4448e6f21cb0db3adef',
  status: 'VERIFIED',
  source: 'governance.aave.com/t/rseth-incident-report-april-20-2026/24580',
  notes: 'Supplied 53,000 rsETH on Aave Ethereum Core.',
};

export const ATTACKER_MULTI_CHAIN: WatchedAddress = {
  address: '0x8d11aeac74267dd5c56d371bf4ae1afa174c2d49',
  status: 'VERIFIED',
  source: 'governance.aave.com/t/rseth-incident-report-april-20-2026/24580',
  notes: 'Active on both Ethereum and Arbitrum.',
};

export const LAYERZERO_ENDPOINT_V2_ETH: WatchedAddress = {
  address: '0x1a44076050125825900e736c501f859c50fE728c',
  status: 'PENDING',
  notes: 'Well-known LayerZero V2 endpoint. Confirm via LayerZero docs.',
};

export const L1_INBOX_UPGRADE_TX: VerifiedTxHash = {
  hash: '0x079984c56c5670108f5c6f664904178f9b364340351949a42e4637d1f645f770',
  status: 'VERIFIED',
  chain: 'ethereum',
  source: 'forum.arbitrum.foundation/t/security-council-emergency-action-21-04-2026/30803',
  notes:
    'L1 Inbox temporary upgrade adding sendUnsignedTransactionOverride. Caller (tx.from) is the Security Council multisig — Arbiscan lookup confirms which one.',
};

// ============================================================================
// Arbitrum One — recovery-side (verified primary targets)
// ============================================================================

export const FROZEN_FUNDS_INTERMEDIARY_WALLET: WatchedAddress = {
  address: '0x0000000000000000000000000000000000000DA0',
  status: 'VERIFIED',
  source: 'forum.arbitrum.foundation/t/security-council-emergency-action-21-04-2026/30803',
  notes:
    'Labeled "Arbitrum: Intermediary Frozen Wallet" on Arbiscan. Holds 30,765.667501709008927568 ETH. Releasable only by Arbitrum DAO Constitutional AIP.',
};

export const L2_FREEZE_TX: VerifiedTxHash = {
  hash: '0x5618044241dade84af6c41b7d84496dc9823700f98b79751e257608dac570f6b',
  status: 'VERIFIED',
  chain: 'arbitrum',
  source: 'forum.arbitrum.foundation/t/security-council-emergency-action-21-04-2026/30803',
  notes:
    'L2 freeze tx — impersonated transfer from "KelpDAO Exploiter 1" address to 0x...0DA0 via the temporary Inbox upgrade. 2026-04-21 03:35:08 UTC.',
};

export const FROZEN_ETH_AMOUNT_WEI = '30765667501709008927568' as const;

export const RECOVERY_SAFE_ARBITRUM: WatchedAddress = {
  address: '0xf228130ce4fAB082C7D5522c90833cec83A9C15e',
  status: 'VERIFIED_PER_AIP',
  source: 'forum.arbitrum.foundation/t/constitutional-aip-approve-release-of-frozen-eth/30825',
  notes:
    '2-of-3 Gnosis Safe. Signers: Aave Labs, KelpDAO, Certora. Recipient of 30,765.67 ETH if Constitutional AIP passes.',
};

// Attacker addresses on Arbitrum (verified via Aave gov)
const AAVE_GOV_SOURCE = 'governance.aave.com/t/rseth-incident-report-april-20-2026/24580';

export const ATTACKER_ARBITRUM_ADDRESSES: readonly WatchedAddress[] = [
  { address: '0xeba786c9517a4823a5cfd9c72e4e80bf8168129b', status: 'VERIFIED', source: AAVE_GOV_SOURCE },
  { address: '0xcbb24a6b4dafaaa1a759a2f413ea0eb6ae1455cc', status: 'VERIFIED', source: AAVE_GOV_SOURCE },
  { address: '0x1b748b680373a1dd70a2319261328cab2a6f644c', status: 'VERIFIED', source: AAVE_GOV_SOURCE },
  { address: '0xbb6a6006eb71205e977eceb19fcad1c8d631c787', status: 'VERIFIED', source: AAVE_GOV_SOURCE },
  { address: '0xe9e2f48bb0018276391aec240abb46e8c3cad181', status: 'VERIFIED', source: AAVE_GOV_SOURCE },
] as const;

// ============================================================================
// Aave V3 / V4 on Arbitrum
// ============================================================================

export const AAVE_V3_POOL_ARBITRUM: WatchedAddress = {
  address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  status: 'PENDING',
  notes: 'Well-known Aave V3 Pool on Arbitrum. Confirm explicitly.',
};

// ============================================================================
// Pending — Security Council multisig (next verification)
// ============================================================================

export const ARBITRUM_SECURITY_COUNCIL: WatchedAddress = {
  address: null,
  status: 'PENDING',
  notes:
    'Identify by reading tx.from on the L1 Inbox upgrade tx (L1_INBOX_UPGRADE_TX). Arbiscan lookup. Likely either emergency 9/12 or non-emergency 7/12 Council Safe.',
};

// ============================================================================
// Event signatures — Gnosis Safe (Security Council multisig + recovery Safe)
// ============================================================================

export const SAFE_EVENT_EXECUTION_SUCCESS =
  'event ExecutionSuccess(bytes32 txHash, uint256 payment)' as const;
export const SAFE_EVENT_EXECUTION_FAILURE =
  'event ExecutionFailure(bytes32 txHash, uint256 payment)' as const;
export const SAFE_EVENT_APPROVE_HASH =
  'event ApproveHash(bytes32 indexed approvedHash, address indexed owner)' as const;
export const SAFE_EVENT_SIGN_MSG = 'event SignMsg(bytes32 indexed msgHash)' as const;
export const SAFE_EVENT_ADDED_OWNER = 'event AddedOwner(address owner)' as const;
export const SAFE_EVENT_REMOVED_OWNER = 'event RemovedOwner(address owner)' as const;
export const SAFE_EVENT_CHANGED_THRESHOLD =
  'event ChangedThreshold(uint256 threshold)' as const;
export const SAFE_EVENT_EXECUTION_FROM_MODULE_SUCCESS =
  'event ExecutionFromModuleSuccess(address indexed module)' as const;
export const SAFE_EVENT_EXECUTION_FROM_MODULE_FAILURE =
  'event ExecutionFromModuleFailure(address indexed module)' as const;

export const SAFE_EVENTS = [
  SAFE_EVENT_EXECUTION_SUCCESS,
  SAFE_EVENT_EXECUTION_FAILURE,
  SAFE_EVENT_APPROVE_HASH,
  SAFE_EVENT_SIGN_MSG,
  SAFE_EVENT_ADDED_OWNER,
  SAFE_EVENT_REMOVED_OWNER,
  SAFE_EVENT_CHANGED_THRESHOLD,
  SAFE_EVENT_EXECUTION_FROM_MODULE_SUCCESS,
  SAFE_EVENT_EXECUTION_FROM_MODULE_FAILURE,
] as const;

// ============================================================================
// Event signatures — ERC-20
// ============================================================================

export const ERC20_TRANSFER =
  'event Transfer(address indexed from, address indexed to, uint256 value)' as const;
export const ERC20_TRANSFER_TOPIC0 =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const;

// ============================================================================
// Event signatures — Arbitrum Governor (OpenZeppelin Governor compatible)
// ============================================================================

export const GOVERNOR_PROPOSAL_CREATED =
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)' as const;
export const GOVERNOR_VOTE_CAST =
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)' as const;
export const GOVERNOR_PROPOSAL_QUEUED =
  'event ProposalQueued(uint256 proposalId, uint256 etaSeconds)' as const;
export const GOVERNOR_PROPOSAL_EXECUTED =
  'event ProposalExecuted(uint256 proposalId)' as const;
export const GOVERNOR_PROPOSAL_CANCELED =
  'event ProposalCanceled(uint256 proposalId)' as const;

export const GOVERNOR_EVENTS = [
  GOVERNOR_PROPOSAL_CREATED,
  GOVERNOR_VOTE_CAST,
  GOVERNOR_PROPOSAL_QUEUED,
  GOVERNOR_PROPOSAL_EXECUTED,
  GOVERNOR_PROPOSAL_CANCELED,
] as const;

// ============================================================================
// Native ETH transfers — IMPORTANT
// ============================================================================
// Native ETH transfers do NOT emit log events. They live at the transaction
// level (tx.value, tx.from, tx.to). To watch the intermediary frozen wallet
// for any outflow, inspect every tx in every Arbitrum block where
// FROZEN_FUNDS_INTERMEDIARY_WALLET appears as `from` or `to`.
// See pipes/wallet-flows/transform.js for implementation.

// ============================================================================
// Deployment guard
// ============================================================================

const ALL_ENTRIES: readonly WatchedAddress[] = [
  RSETH_OFT_ADAPTER,
  ATTACKER_ETH_CORE,
  ATTACKER_MULTI_CHAIN,
  LAYERZERO_ENDPOINT_V2_ETH,
  FROZEN_FUNDS_INTERMEDIARY_WALLET,
  RECOVERY_SAFE_ARBITRUM,
  ARBITRUM_SECURITY_COUNCIL,
  AAVE_V3_POOL_ARBITRUM,
  ...ATTACKER_ARBITRUM_ADDRESSES,
];

/**
 * Throws if any address required for live indexing is still PENDING.
 * VERIFIED_PER_AIP is allowed (treated as authoritative pre-execution).
 */
export function assertAllAddressesVerified(): void {
  const pending = ALL_ENTRIES.filter((a) => a.status === 'PENDING');
  if (pending.length > 0) {
    const list = pending.map((p) => `  - ${p.address ?? '(null)'}: ${p.notes ?? '(no notes)'}`).join('\n');
    throw new Error(
      `Cannot deploy: ${pending.length} address(es) still PENDING.\n${list}\nSee docs/addresses.md for verification workflow.`,
    );
  }
}
