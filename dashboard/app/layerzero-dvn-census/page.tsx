import { Layout } from '@/components/Layout';
import { getLatestDvnConfigs, getDvnCensusStats, type OAppDvnConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DVN_LABELS: Record<string, string> = {
  '0x380275805876ff19055ea900cdb2b46a94ecf20d': 'Horizen Labs',
  '0x589dedbd617e0cbcb916a9223f4d1300c294236b': 'LayerZero Labs',
  '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd': 'Canary',
  '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5': 'Nethermind',
};

const COMPROMISED_DVN = '0x589dedbd617e0cbcb916a9223f4d1300c294236b';

function dvnLabel(addr: string): string {
  return DVN_LABELS[addr.toLowerCase()] ?? `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export default async function CensusPage() {
  const [rows, stats] = await Promise.all([getLatestDvnConfigs(), getDvnCensusStats()]);
  const oneOfOneRoutes = rows.filter((r) => r.required_dvn_count === 1);
  const lastRun = stats.last_run ? new Date(stats.last_run).toISOString().slice(0, 10) : '—';

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">LayerZero V2 — DVN census</h1>
        <p className="text-ink-500 text-sm">
          Live snapshot of LayerZero V2 OApp configurations across the OFTs we monitor.
          Reads directly from{' '}
          <code className="font-mono text-xs text-ink-300">EndpointV2.getConfig()</code>
          . Last run: {lastRun}.
        </p>
        <p className="text-ink-500 text-xs mt-2">
          Why this exists: 14 days ago, KelpDAO was drained $292M because their bridge ran
          1-of-1 DVN. CoinDesk reported ~40% of LayerZero apps still ran the same config.
          This page tracks who's still exposed.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Counter label="OApps tracked" value={stats.total_oapps} />
        <Counter label="Routes verified" value={stats.total_routes} />
        <Counter
          label="Routes at 1-of-1"
          value={stats.routes_at_1of1}
          warn={stats.routes_at_1of1 > 0}
          sub={stats.total_routes > 0 ? `${Math.round((stats.routes_at_1of1 / stats.total_routes) * 100)}% of total` : undefined}
        />
        <Counter
          label="Routes at 4+ DVNs"
          value={stats.routes_4plus}
          ok={stats.routes_4plus > 0}
          sub={stats.total_routes > 0 ? `${Math.round((stats.routes_4plus / stats.total_routes) * 100)}% of total` : undefined}
        />
      </div>

      {oneOfOneRoutes.length > 0 && (
        <section className="mb-8 border border-accent-warn/40 rounded-card bg-accent-warn/5 p-6">
          <h2 className="text-lg font-semibold text-accent-warn mb-2">
            ⚠ OApps still running 1-of-1 DVN ({oneOfOneRoutes.length} {oneOfOneRoutes.length === 1 ? 'route' : 'routes'})
          </h2>
          <p className="text-sm text-ink-300 mb-4">
            Same configuration profile as the rsETH OFT pre-exploit. A single compromised
            DVN signature is sufficient to authenticate any cross-chain message.
          </p>
          <CensusTable rows={oneOfOneRoutes} highlight="warn" />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">All routes</h2>
        <CensusTable rows={rows} />
      </section>

      <div className="mt-12 p-6 border border-ink-800 rounded-card bg-ink-900 text-center">
        <div className="text-sm text-ink-300 mb-3">
          Want to monitor your protocol's DVN configuration? Or get alerts when an OApp
          changes config?
        </div>
        <a
          href="https://indexing.co/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand inline-block px-6 py-2.5"
        >
          Contact us →
        </a>
      </div>

      <div className="mt-8 text-xs text-ink-500">
        How to extend the census: add an entry to{' '}
        <a
          href="https://github.com/indexing-co/kelpdao-hack-tracker/blob/main/data/oapp-registry.json"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-green hover:opacity-80"
        >
          data/oapp-registry.json
        </a>{' '}
        and run{' '}
        <code className="font-mono text-ink-300">node scripts/run-dvn-census.mjs</code>.
        PRs welcome.
      </div>
    </Layout>
  );
}

function CensusTable({ rows, highlight }: { rows: OAppDvnConfig[]; highlight?: 'warn' | 'ok' }) {
  if (rows.length === 0) {
    return (
      <div className="border border-ink-800 rounded-card bg-ink-900 px-6 py-12 text-center text-ink-500 text-sm">
        No data yet. Run <code className="font-mono">node scripts/run-dvn-census.mjs</code>.
      </div>
    );
  }
  return (
    <div className="border border-ink-800 rounded-card bg-ink-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-xs uppercase tracking-wider text-ink-500">
            <th className="text-left px-4 py-2.5 font-medium">OApp</th>
            <th className="text-left px-4 py-2.5 font-medium">Route</th>
            <th className="text-right px-4 py-2.5 font-medium">DVNs</th>
            <th className="text-right px-4 py-2.5 font-medium">Confirmations</th>
            <th className="text-left px-4 py-2.5 font-medium">DVN set</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOneOfOne = r.required_dvn_count === 1;
            const includesCompromised = r.required_dvns.some(
              (d) => d.toLowerCase() === COMPROMISED_DVN,
            );
            return (
              <tr
                key={`${r.src_chain}-${r.oapp_address}-${r.dst_eid}`}
                className={`border-b border-ink-800 last:border-b-0 ${
                  isOneOfOne ? 'bg-accent-warn/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <a
                    href={`https://etherscan.io/address/${r.oapp_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-green transition-colors"
                  >
                    <div className="font-medium text-ink-100">
                      {r.oapp_name ?? '(unnamed)'}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {r.protocol ?? ''}
                    </div>
                  </a>
                </td>
                <td className="px-4 py-3 text-xs text-ink-300">
                  {r.src_chain} → {r.dst_chain ?? r.dst_eid}
                </td>
                <td
                  className={`px-4 py-3 text-right num-tabular font-medium ${
                    isOneOfOne
                      ? 'text-accent-warn'
                      : r.required_dvn_count >= 4
                        ? 'text-brand-green'
                        : 'text-ink-100'
                  }`}
                >
                  {r.required_dvn_count}-of-{r.required_dvn_count}
                </td>
                <td className="px-4 py-3 text-right num-tabular text-ink-100">
                  {r.confirmations}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {r.required_dvns.map((d) => (
                      <a
                        key={d}
                        href={`https://etherscan.io/address/${d}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-1.5 py-0.5 rounded font-mono text-xs hover:opacity-80 ${
                          d.toLowerCase() === COMPROMISED_DVN
                            ? 'bg-accent-warn/20 text-accent-warn'
                            : 'bg-ink-800 text-ink-300'
                        }`}
                        title={d}
                      >
                        {dvnLabel(d)}
                      </a>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Counter({
  label,
  value,
  sub,
  warn,
  ok,
}: {
  label: string;
  value: number | string;
  sub?: string;
  warn?: boolean;
  ok?: boolean;
}) {
  const accentClass = warn
    ? 'text-accent-warn'
    : ok
      ? 'text-brand-green'
      : 'text-ink-100';
  return (
    <div className="border border-ink-800 rounded-card bg-ink-900 px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`text-xl font-medium num-tabular ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}
