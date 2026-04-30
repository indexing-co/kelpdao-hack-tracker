/**
 * Bridge hardening panel — renders the on-chain receipt of KelpDAO's
 * post-hack DVN reconfiguration. Reads from a static JSON receipt produced by
 * scripts/find-kelp-hardening-tx.mjs (decoded UlnConfigSet events from the
 * mainnet ULN302 send library).
 *
 * The pre/post values come from reading EndpointV2.getConfig() at block N-1
 * and block N around each event, so this is a true diff, not a guess.
 */

import receipt from '@/data/rseth-oft-hardening-events.json';

const DVN_LABELS: Record<string, string> = {
  '0x380275805876ff19055ea900cdb2b46a94ecf20d': 'Horizen Labs',
  '0x589dedbd617e0cbcb916a9223f4d1300c294236b': 'LayerZero Labs',
  '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd': 'Canary',
  '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5': 'Nethermind',
  '0x8ddf05f9a5c488b4973897e278b58895bf87cb24': 'Polyhedra',
  '0x06559ee34d85a88317bf0bfe307444116c631b67': 'Stargate',
};

const COMPROMISED_DVN = '0x589dedbd617e0cbcb916a9223f4d1300c294236b';

const HACK_TIMESTAMP = '2026-04-18T00:00:00.000Z';

interface UlnConfig {
  confirmations: number;
  requiredDVNCount: number;
  optionalDVNCount: number;
  optionalDVNThreshold: number;
  requiredDVNs: string[];
  optionalDVNs: string[];
}

interface RouteDelta {
  dstEid: number;
  dstName: string;
  pre: UlnConfig | null;
  post: UlnConfig | null;
}

interface HardeningEvent {
  txHash: string;
  blockNumber: string;
  blockTimestamp: string;
  from: string;
  to: string;
  routes: RouteDelta[];
}

function dvnLabel(addr: string): string {
  return DVN_LABELS[addr.toLowerCase()] ?? `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDelay(hackIso: string, eventIso: string): string {
  const hours = Math.round(
    (new Date(eventIso).getTime() - new Date(hackIso).getTime()) / 3_600_000,
  );
  const days = Math.floor(hours / 24);
  const remHours = hours - days * 24;
  if (days <= 0) return `${hours}h after exploit`;
  return `${days}d ${remHours}h after exploit`;
}

function dvnSetLabel(cfg: UlnConfig | null): string {
  if (!cfg) return '(no config)';
  if (cfg.requiredDVNCount === 0) return 'default config';
  return `${cfg.requiredDVNCount}-of-${cfg.requiredDVNCount}`;
}

function ConfigBadge({ cfg, kind }: { cfg: UlnConfig | null; kind: 'pre' | 'post' }) {
  if (!cfg) {
    return <span className="text-xs text-ink-500">(none)</span>;
  }
  const isOneOfOne = cfg.requiredDVNCount === 1;
  const colorClass =
    kind === 'pre' && isOneOfOne
      ? 'text-accent-warn'
      : kind === 'post' && cfg.requiredDVNCount >= 4
        ? 'text-brand-green'
        : 'text-ink-100';
  return (
    <div>
      <div className={`font-medium num-tabular ${colorClass}`}>
        {dvnSetLabel(cfg)}{' '}
        <span className="text-ink-500 font-normal">· {cfg.confirmations} conf</span>
      </div>
      <div className="text-xs text-ink-500 mt-0.5">
        {cfg.requiredDVNs.map((d) => dvnLabel(d)).join(', ')}
      </div>
    </div>
  );
}

export function BridgeHardeningPanel() {
  const events = (receipt.events as HardeningEvent[]).slice().sort((a, b) => {
    return Number(BigInt(a.blockNumber) - BigInt(b.blockNumber));
  });

  // Headline tx = the one with the most routes (Kelp's main hardening batch).
  const headline = events.reduce<HardeningEvent | null>((best, cur) => {
    if (!best) return cur;
    return cur.routes.length > best.routes.length ? cur : best;
  }, null);

  if (!headline) {
    return null;
  }

  const totalRoutes = events.reduce((n, e) => n + e.routes.length, 0);
  const oneOfOnePreCount = events.reduce(
    (n, e) => n + e.routes.filter((r) => r.pre?.requiredDVNCount === 1).length,
    0,
  );
  const fourPlusPostCount = events.reduce(
    (n, e) => n + e.routes.filter((r) => (r.post?.requiredDVNCount ?? 0) >= 4).length,
    0,
  );

  return (
    <>
      <section className="mb-6 border border-brand-green/40 rounded-card bg-brand-green/5 p-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-brand-green mb-1">
              Featured config change · post-hack
            </div>
            <h2 className="text-lg font-semibold text-ink-100">
              KelpDAO rsETH OFT — bridge hardened in a single tx
            </h2>
            <p className="text-sm text-ink-300 mt-1 leading-relaxed">
              {headline.routes.length} outbound routes upgraded from a single LayerZero
              Labs DVN to a 4-of-4 set with Horizen Labs, Canary, and Nethermind.{' '}
              Confirmations went 42 → 64.
            </p>
          </div>
          <div className="text-xs text-ink-500 num-tabular text-right shrink-0">
            <div className="text-ink-100 font-medium">
              {new Date(headline.blockTimestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC
            </div>
            <div>{formatDelay(HACK_TIMESTAMP, headline.blockTimestamp)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-4">
          <a
            href={`https://etherscan.io/tx/${headline.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink-800 rounded bg-ink-900 px-3 py-2 hover:border-brand-green transition-colors"
          >
            <div className="text-ink-500 uppercase tracking-wider">Tx</div>
            <div className="font-mono text-ink-100 mt-0.5">{shortAddr(headline.txHash)}</div>
          </a>
          <a
            href={`https://etherscan.io/block/${headline.blockNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink-800 rounded bg-ink-900 px-3 py-2 hover:border-brand-green transition-colors"
          >
            <div className="text-ink-500 uppercase tracking-wider">Block</div>
            <div className="font-mono text-ink-100 mt-0.5 num-tabular">{headline.blockNumber}</div>
          </a>
          <a
            href={`https://etherscan.io/address/${headline.from}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink-800 rounded bg-ink-900 px-3 py-2 hover:border-brand-green transition-colors"
          >
            <div className="text-ink-500 uppercase tracking-wider">Signer</div>
            <div className="font-mono text-ink-100 mt-0.5">{shortAddr(headline.from)}</div>
          </a>
          <a
            href={`https://etherscan.io/address/${headline.to}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink-800 rounded bg-ink-900 px-3 py-2 hover:border-brand-green transition-colors"
          >
            <div className="text-ink-500 uppercase tracking-wider">Routed via</div>
            <div className="font-mono text-ink-100 mt-0.5">{shortAddr(headline.to)}</div>
          </a>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="border border-ink-800 rounded bg-ink-900 px-3 py-2">
            <div className="text-xs uppercase tracking-widest text-ink-500">Routes hardened</div>
            <div className="text-xl font-semibold num-tabular text-ink-100">{totalRoutes}</div>
          </div>
          <div className="border border-ink-800 rounded bg-ink-900 px-3 py-2">
            <div className="text-xs uppercase tracking-widest text-ink-500">Pre-hack 1-of-1</div>
            <div className="text-xl font-semibold num-tabular text-accent-warn">
              {oneOfOnePreCount}
            </div>
          </div>
          <div className="border border-ink-800 rounded bg-ink-900 px-3 py-2">
            <div className="text-xs uppercase tracking-widest text-ink-500">Post 4+ DVNs</div>
            <div className="text-xl font-semibold num-tabular text-brand-green">
              {fourPlusPostCount}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-medium text-ink-100 mb-3 uppercase tracking-wider">
          Per-route diff
        </h3>
        <div className="border border-ink-800 rounded-card bg-ink-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-xs uppercase tracking-wider text-ink-500">
                <th className="text-left px-4 py-2.5 font-medium">Destination</th>
                <th className="text-left px-4 py-2.5 font-medium">Before</th>
                <th className="text-left px-4 py-2.5 font-medium">After</th>
                <th className="text-right px-4 py-2.5 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody>
              {events.flatMap((ev) =>
                ev.routes.map((r) => (
                  <tr
                    key={`${ev.txHash}-${r.dstEid}`}
                    className="border-b border-ink-800 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-100">{r.dstName}</div>
                      <div className="text-xs text-ink-500 mt-0.5 num-tabular">eid {r.dstEid}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ConfigBadge cfg={r.pre} kind="pre" />
                    </td>
                    <td className="px-4 py-3">
                      <ConfigBadge cfg={r.post} kind="post" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`https://etherscan.io/tx/${ev.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-ink-500 hover:text-brand-green transition-colors"
                      >
                        {shortAddr(ev.txHash)} ↗
                      </a>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Pre/post configs read directly from{' '}
          <code className="font-mono text-ink-300">EndpointV2.getConfig()</code> at the block
          before and at the block of each{' '}
          <code className="font-mono text-ink-300">UlnConfigSet</code> event — not Kelp's
          self-reported state. {COMPROMISED_DVN.slice(0, 10)}… is the LayerZero Labs DVN that
          was compromised on April 18.
        </p>
      </section>
    </>
  );
}
