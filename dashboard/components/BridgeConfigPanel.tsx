/**
 * Bridge config panel — renders the live LayerZero V2 OApp config for the
 * rsETH OFT adapter. Reads from a static JSON receipt produced by
 * scripts/check-layerzero-config.mjs.
 *
 * Eventually this should live-read from EndpointV2 directly (Path B),
 * but for the v1 we ship the verified snapshot.
 */

import receipt from '../../docs/rseth-oft-config-2026-04-29.json';

const DVN_LABELS: Record<string, string> = {
  '0x380275805876ff19055ea900cdb2b46a94ecf20d': 'Horizen Labs',
  '0x589dedbd617e0cbcb916a9223f4d1300c294236b': 'LayerZero Labs',
  '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd': 'Canary',
  '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5': 'Nethermind',
};

const COMPROMISED_DVN = '0x589dedbd617e0cbcb916a9223f4d1300c294236b';

interface RouteResult {
  src: string;
  dst: string;
  ok: boolean;
  error?: string;
  sendLib?: string;
  confirmations?: number;
  requiredDVNCount?: number;
  optionalDVNCount?: number;
  optionalDVNThreshold?: number;
  requiredDVNs?: string[];
  optionalDVNs?: string[];
}

function dvnLabel(addr: string): string {
  return DVN_LABELS[addr.toLowerCase()] ?? `unknown (${addr.slice(0, 10)}…)`;
}

export function BridgeConfigPanel() {
  const results = receipt.results as RouteResult[];
  const ethOutbound = results.filter((r) => r.src === 'ethereum' && r.ok);
  const verified = ethOutbound[0];
  const allDvnsConsistent = ethOutbound.every(
    (r) =>
      r.ok &&
      JSON.stringify(r.requiredDVNs?.map((d) => d.toLowerCase()).sort()) ===
        JSON.stringify(verified?.requiredDVNs?.map((d) => d.toLowerCase()).sort()),
  );

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Bridge config (verified on-chain)</h2>
          <p className="text-sm text-ink-500 mt-0.5">
            Live LayerZero V2 OApp configuration for the rsETH OFT adapter on Ethereum.
            Read directly from <code className="font-mono text-xs text-ink-300">EndpointV2.getConfig()</code> on{' '}
            {receipt.readAt
              ? new Date(receipt.readAt).toISOString().slice(0, 10)
              : ''}
            . Cross-references{' '}
            <a
              href="https://x.com/KelpDAO/status/2049499708406800777"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-green hover:opacity-80"
            >
              Kelp's post-mortem claim ↗
            </a>{' '}
            of 4-of-4 DVNs and 64 confirmations.
          </p>
        </div>
        <div className="text-xs num-tabular">
          {allDvnsConsistent ? (
            <span className="px-2 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">
              consistent ✓
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-accent-warn/20 text-accent-warn font-medium">
              drift detected
            </span>
          )}
        </div>
      </div>

      {verified && (
        <div className="border border-ink-800 rounded-card bg-ink-900 p-6 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">
                Required DVNs
              </div>
              <div className="text-2xl font-semibold num-tabular text-ink-100">
                {verified.requiredDVNCount}-of-{verified.requiredDVNCount}
              </div>
              <div className="text-xs text-ink-500 mt-1">
                pre-hack: 1-of-1 (single DVN)
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">
                Block confirmations
              </div>
              <div className="text-2xl font-semibold num-tabular text-ink-100">
                {verified.confirmations}
              </div>
              <div className="text-xs text-ink-500 mt-1">pre-hack: 42</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">
                Routes verified
              </div>
              <div className="text-2xl font-semibold num-tabular text-ink-100">
                {ethOutbound.length}
              </div>
              <div className="text-xs text-ink-500 mt-1">
                ETH outbound to {ethOutbound.map((r) => r.dst).join(', ')}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-ink-800">
            <div className="text-xs uppercase tracking-widest text-ink-500 mb-3">
              Required DVNs (same set on every ETH-outbound route)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {verified.requiredDVNs?.map((d) => {
                const isCompromised = d.toLowerCase() === COMPROMISED_DVN;
                return (
                  <a
                    key={d}
                    href={`https://etherscan.io/address/${d}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border border-ink-800 rounded px-3 py-2 hover:border-brand-green transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink-100">
                        {dvnLabel(d)}
                        {isCompromised && (
                          <span className="ml-2 text-xs text-accent-warn">(was compromised in April 18 exploit)</span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-ink-500 mt-0.5">
                        {d.slice(0, 10)}…{d.slice(-6)}
                      </div>
                    </div>
                    <span className="text-ink-500 text-xs">↗</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-ink-500">
        <strong className="text-ink-300">Pending verification:</strong> reverse direction
        (L2 → Ethereum) requires the rsETH OFT contract addresses on each L2, which we
        haven't indexed yet. Outbound from Ethereum is fully verified.
      </div>
    </section>
  );
}
