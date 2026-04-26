/**
 * Watched addresses and event signatures for the KelpDAO Hack Tracker.
 *
 * Every entry in this file is one of:
 *   - VERIFIED  — confirmed on-chain via block explorer + secondary source
 *   - PENDING   — placeholder, blocks deployment until human-reviewed
 *
 * Verification policy: see docs/addresses.md
 * Event signatures:    see docs/event-signatures.md
 *
 * To verify a PENDING entry:
 *   1. Confirm address on Arbiscan/Etherscan
 *   2. Cross-reference with primary source (forum / official announcement)
 *   3. Update this file: change PENDING → VERIFIED, add source URL comment
 *   4. Update docs/addresses.md verification log
 */

// ============================================================================
// Verification status type
// ============================================================================

export type VerificationStatus = 'VERIFIED' | 'PENDING';

interface WatchedAddress {
  readonly address: `0x${string}` | null;
  readonly status: VerificationStatus;
  readonly source?: string;
  readonly verifiedAt?: string; // ISO date
  readonly notes?: string;
}

// ============================================================================
// Ethereum Mainnet — exploit-side
// ============================================================================

export const ATTACKER_EOA: WatchedAddress = {
  address: '0x8B1b6c9A6DB1304000412dd21Ae6A70a82d60D3b',
  status: 'PENDING',
  source: 'defiprime.com/kelpdao-rseth-exploit',
  notes: 'Cited in forensic write-up. Verify on Etherscan before indexing.',
};

export const EXPLOIT_TX_HASH = {
  hash: '0x1ae232da212c45f35c1525f851e4c41d529bf18af862d9ce9fd40bf709db4222',
  status: 'PENDING' as VerificationStatus,
  source: 'defiprime.com/kelpdao-rseth-exploit',
} as const;

export const LAYERZERO_ENDPOINT_V2_ETH: WatchedAddress = {
  address: '0x1a44076050125825900e736c501f859c50fE728c',
  status: 'PENDING',
  notes: 'Well-known LayerZero V2 endpoint on Ethereum. Easy to verify via LayerZero docs.',
};

export const RSETH_OFT_ADAPTER: WatchedAddress = {
  address: '0x85d456B2DfF1fd8245387C0BfB64Dfb700e98Ef3',
  status: 'PENDING',
  source: 'defiprime.com/kelpdao-rseth-exploit',
};

// ============================================================================
// Arbitrum One — recovery-side (CRITICAL — all PENDING)
// ============================================================================

export const ARBITRUM_SECURITY_COUNCIL_EMERGENCY: WatchedAddress = {
  address: null,
  status: 'PENDING',
  notes:
    'Emergency Security Council (9/12 signers, subject to change). Source from docs.arbitrum.foundation. NEEDS HUMAN REVIEW.',
};

export const ARBITRUM_SECURITY_COUNCIL_NON_EMERGENCY: WatchedAddress = {
  address: null,
  status: 'PENDING',
  notes:
    'Non-emergency Security Council (7/12 signers, subject to change). Source from docs.arbitrum.foundation. NEEDS HUMAN REVIEW.',
};

export const FREEZE_TRANSACTION_HASH = {
  hash: null as string | null,
  status: 'PENDING' as VerificationStatus,
  notes:
    'CRITICAL: the actual freeze tx hash. Source from Arbitrum Foundation tweet, governance forum, or KelpDAO post-mortem. Decoding this tx will reveal the freeze mechanism (sequencer censorship vs upgrade-authorized sweep vs trapped-in-contract).',
} as const;

export const FROZEN_FUNDS_INTERMEDIARY_WALLET: WatchedAddress = {
  address: null,
  status: 'PENDING',
  notes:
    'CRITICAL: holds 30,766 ETH on Arbitrum One. Verify by checking current balance on Arbiscan matches reported amount. NEEDS HUMAN REVIEW.',
};

export const ATTACKER_ARBITRUM_ADDRESS: WatchedAddress = {
  address: null,
  status: 'PENDING',
  notes:
    'Likely same EOA as Eth mainnet attacker, but verify via the actual Aave V3 Arbitrum borrow tx that the attacker executed.',
};

// ============================================================================
// Aave V3 / V4 on Arbitrum (well-known but unconfirmed for this build)
// ============================================================================

export const AAVE_V3_POOL_ARBITRUM: WatchedAddress = {
  address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  status: 'PENDING',
  notes: 'Well-known Aave V3 Pool on Arbitrum. Confirm explicitly.',
};

// ============================================================================
// Event signatures — Gnosis Safe (Security Council multisig)
// ============================================================================
// CONFIRM: which Safe version is deployed (v1.3 vs v1.4). Some events differ.

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
// CONFIRM: which Arbitrum governor contract holds KelpDAO recovery proposals.

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
// level (tx.value, tx.from, tx.to). To index ETH movement to/from a wallet,
// inspect every tx in every block where the watched address appears as
// from/to. See pipes/wallet-flows/transform.js for the full implementation.

// ============================================================================
// Deployment guard
// ============================================================================

const ALL_WATCHED_ADDRESSES: readonly WatchedAddress[] = [
  ATTACKER_EOA,
  LAYERZERO_ENDPOINT_V2_ETH,
  RSETH_OFT_ADAPTER,
  ARBITRUM_SECURITY_COUNCIL_EMERGENCY,
  ARBITRUM_SECURITY_COUNCIL_NON_EMERGENCY,
  FROZEN_FUNDS_INTERMEDIARY_WALLET,
  ATTACKER_ARBITRUM_ADDRESS,
  AAVE_V3_POOL_ARBITRUM,
] as const;

/**
 * Throws if any address is still PENDING. Run this in deployment scripts
 * to prevent fabricated/placeholder addresses from being wired into a live
 * pipeline.
 */
export function assertAllAddressesVerified(): void {
  const pending = ALL_WATCHED_ADDRESSES.filter((a) => a.status !== 'VERIFIED');
  if (pending.length > 0) {
    throw new Error(
      `Cannot deploy: ${pending.length} address(es) pending human review. See docs/addresses.md.`,
    );
  }
}
