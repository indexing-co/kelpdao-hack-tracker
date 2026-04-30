/**
 * Formatting helpers for on-chain data.
 */

export function formatEthFromWei(wei: string | bigint, decimals = 4): string {
  const w = typeof wei === 'string' ? BigInt(wei) : wei;
  const negative = w < 0n;
  const abs = negative ? -w : w;
  const divisor = 10n ** 18n;
  const whole = abs / divisor;
  const frac = abs % divisor;
  // Pad fraction to 18 digits then truncate to `decimals`
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals);
  const out = `${whole.toString()}.${fracStr}`;
  return (negative ? '-' : '') + addThousands(out);
}

function addThousands(num: string): string {
  const [w, f] = num.split('.');
  return w.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f !== undefined ? `.${f}` : '');
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function shortHash(hash: string): string {
  return shortAddress(hash, 8, 6);
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '—';
  const diff = (now.getTime() - t) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatUtc(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

const KNOWN_LABELS: Record<string, string> = {
  '0x0000000000000000000000000000000000000da0': 'Arbitrum: Intermediary Frozen Wallet',
  '0x5d3919f12bcc35c26eee5f8226a9bee90c257ccc': 'KelpDAO Exploiter 1',
  '0xf228130ce4fab082c7d5522c90833cec83a9c15e': 'Recovery Safe (2-of-3, per AIP)',
  '0xf06e95ef589d9c38af242a8aaee8375f14023f85': 'Arbitrum Foundation: L1 Security Council 9',
  '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f': 'Arbitrum: Delayed Inbox',
  '0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a': 'Arbitrum: Bridge',
  '0x3fffbadaf827559da092217e474760e2b2c3cedd': 'Arbitrum Foundation: Upgrade Executor',
  '0x10590a5c93e8695bdb134c22f04c4d5b50755dc4': 'Security Council 9 — signer',
};

export function labelForAddress(addr: string): string | null {
  return KNOWN_LABELS[addr.toLowerCase()] ?? null;
}

const EXPLORER_BASE: Record<string, string> = {
  ethereum: 'https://etherscan.io',
  arbitrum: 'https://arbiscan.io',
};

export function explorerTx(chain: string, hash: string): string {
  return `${EXPLORER_BASE[chain] ?? EXPLORER_BASE.ethereum}/tx/${hash}`;
}

export function explorerAddress(chain: string, addr: string): string {
  return `${EXPLORER_BASE[chain] ?? EXPLORER_BASE.ethereum}/address/${addr}`;
}

export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}
