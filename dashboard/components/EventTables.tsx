import {
  formatEthFromWei,
  formatRelative,
  formatUtc,
  labelForAddress,
  shortAddress,
  shortHash,
  explorerTx,
  explorerAddress,
} from '@/lib/format';
import type { WalletFlow, MultisigEvent, FreezeEvent } from '@/lib/db';

export function WalletFlowsTable({ rows }: { rows: WalletFlow[] }) {
  return (
    <Section title="Wallet flows" subtitle="Native ETH movement on the watched cohort (Arbitrum)" count={rows.length}>
      {rows.length === 0 ? (
        <Empty>No movements indexed yet. Backfill block 454,686,044 to seed the freeze tx.</Empty>
      ) : (
        <Table>
          <thead>
            <Tr>
              <Th>When</Th>
              <Th>Watched</Th>
              <Th>Dir</Th>
              <Th>Counterparty</Th>
              <Th>Amount (ETH)</Th>
              <Th>Tx</Th>
            </Tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const counterparty = r.direction === 'in' ? r.from_address : r.to_address;
              return (
                <Tr key={`${r.transaction_hash}-${r.watched_address}-${r.direction}`}>
                  <Td>
                    <div>{formatRelative(r.block_timestamp)}</div>
                    <div className="text-ink-500 text-xs num-tabular">{formatUtc(r.block_timestamp)}</div>
                  </Td>
                  <Td>
                    <AddressCell chain={r.chain} addr={r.watched_address} headline={r.is_headline} />
                  </Td>
                  <Td>
                    <DirectionBadge dir={r.direction} headline={r.is_headline} />
                  </Td>
                  <Td>
                    <AddressCell chain={r.chain} addr={counterparty} />
                  </Td>
                  <Td>
                    <span className="num-tabular">{formatEthFromWei(r.amount_wei, 6)}</span>
                  </Td>
                  <Td>
                    <a
                      href={explorerTx(r.chain, r.transaction_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-accent hover:text-cyan-300"
                    >
                      {shortHash(r.transaction_hash)}
                    </a>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Section>
  );
}

export function MultisigEventsTable({ rows }: { rows: MultisigEvent[] }) {
  return (
    <Section
      title="Security Council events (L1)"
      subtitle="Gnosis Safe events on the Arbitrum L1 Security Council 9 multisig"
      count={rows.length}
    >
      {rows.length === 0 ? (
        <Empty>No events indexed yet.</Empty>
      ) : (
        <Table>
          <thead>
            <Tr>
              <Th>When</Th>
              <Th>Event</Th>
              <Th>Multisig</Th>
              <Th>Decoded</Th>
              <Th>Tx</Th>
            </Tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={`${r.transaction_hash}-${r.log_index}`}>
                <Td>
                  <div>{formatRelative(r.block_timestamp)}</div>
                  <div className="text-ink-500 text-xs num-tabular">{formatUtc(r.block_timestamp)}</div>
                </Td>
                <Td>
                  <span className="font-medium">{r.event_name}</span>
                </Td>
                <Td>
                  <AddressCell chain={r.chain} addr={r.contract_address} />
                </Td>
                <Td>
                  <DecodedCell decoded={r.decoded} />
                </Td>
                <Td>
                  <a
                    href={explorerTx(r.chain, r.transaction_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-accent hover:text-cyan-300"
                  >
                    {shortHash(r.transaction_hash)}
                  </a>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Section>
  );
}

export function FreezeEventsTable({ rows }: { rows: FreezeEvent[] }) {
  return (
    <Section
      title="Arbitrum L1 freeze contracts"
      subtitle="Inbox + Bridge + Upgrade Executor — the contracts the Security Council temporarily upgraded for the impersonated transfer"
      count={rows.length}
    >
      {rows.length === 0 ? (
        <Empty>No events indexed yet.</Empty>
      ) : (
        <Table>
          <thead>
            <Tr>
              <Th>When</Th>
              <Th>Contract</Th>
              <Th>Event</Th>
              <Th>Decoded (key fields)</Th>
              <Th>Tx</Th>
            </Tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={`${r.transaction_hash}-${r.log_index}`}>
                <Td>
                  <div>{formatRelative(r.block_timestamp)}</div>
                  <div className="text-ink-500 text-xs num-tabular">{formatUtc(r.block_timestamp)}</div>
                </Td>
                <Td>
                  <div className="text-xs text-ink-300">{r.contract_label}</div>
                </Td>
                <Td>
                  <span className="font-medium">{r.event_name}</span>
                </Td>
                <Td>
                  <DecodedCell decoded={r.decoded} keysFirst={['nextVersion', 'sender', 'messageNum', 'upgrade']} />
                </Td>
                <Td>
                  <a
                    href={explorerTx(r.chain, r.transaction_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-accent hover:text-cyan-300"
                  >
                    {shortHash(r.transaction_hash)}
                  </a>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Section>
  );
}

// ============================================================================
// Primitives
// ============================================================================

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-xs text-ink-500 num-tabular">{count} rows</div>
      </div>
      <div className="border border-ink-800 rounded-lg bg-ink-900 overflow-hidden">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-12 text-center text-ink-500 text-sm">{children}</div>;
}

function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm">{children}</table>;
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-ink-800 last:border-b-0">{children}</tr>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-ink-500">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

function AddressCell({
  chain,
  addr,
  headline,
}: {
  chain: string;
  addr: string;
  headline?: boolean;
}) {
  const label = labelForAddress(addr);
  return (
    <a
      href={explorerAddress(chain, addr)}
      target="_blank"
      rel="noopener noreferrer"
      className="block hover:text-ink-100"
    >
      {label && (
        <div className={`text-xs ${headline ? 'text-accent' : 'text-ink-300'}`}>
          {headline && '★ '}
          {label}
        </div>
      )}
      <div className="font-mono text-xs text-ink-500">{shortAddress(addr)}</div>
    </a>
  );
}

function DirectionBadge({ dir, headline }: { dir: 'in' | 'out'; headline: boolean }) {
  const cls =
    dir === 'in'
      ? headline
        ? 'bg-accent-ok/20 text-accent-ok'
        : 'bg-ink-800 text-ink-300'
      : headline
        ? 'bg-accent-warn/20 text-accent-warn'
        : 'bg-ink-800 text-ink-300';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${cls}`}>{dir}</span>;
}

function DecodedCell({
  decoded,
  keysFirst,
}: {
  decoded: Record<string, unknown>;
  keysFirst?: string[];
}) {
  const keys = Object.keys(decoded);
  const ordered = keysFirst
    ? [...keysFirst.filter((k) => keys.includes(k)), ...keys.filter((k) => !keysFirst.includes(k))]
    : keys;
  const shown = ordered.slice(0, 3);
  return (
    <div className="space-y-0.5 max-w-md">
      {shown.map((k) => (
        <div key={k} className="text-xs">
          <span className="text-ink-500">{k}: </span>
          <span className="font-mono text-ink-300">{stringifyShort(decoded[k])}</span>
        </div>
      ))}
      {ordered.length > 3 && (
        <div className="text-xs text-ink-500">+{ordered.length - 3} more fields</div>
      )}
    </div>
  );
}

function stringifyShort(v: unknown): string {
  if (typeof v === 'string') {
    if (v.startsWith('0x') && v.length > 22) return shortHash(v);
    return v.length > 40 ? `${v.slice(0, 38)}…` : v;
  }
  return String(v);
}
