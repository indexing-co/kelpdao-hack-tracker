import { formatEthFromWei, formatRelative, formatUtc, shortHash, explorerTx } from '@/lib/format';
import type { WalletFlow } from '@/lib/db';

interface Props {
  current_balance_wei: string;
  total_inflows_wei: string;
  total_outflows_wei: string;
  last_movement: WalletFlow | null;
}

export function HeadlinePanel(props: Props) {
  const balanceEth = formatEthFromWei(props.current_balance_wei, 6);
  const inflowEth = formatEthFromWei(props.total_inflows_wei, 6);
  const outflowEth = formatEthFromWei(props.total_outflows_wei, 6);
  const recovered = props.current_balance_wei !== props.total_inflows_wei;

  return (
    <section className="border border-ink-800 rounded-lg bg-ink-900 p-8">
      <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">
            Currently frozen on Arbitrum
          </div>
          <div className="text-5xl font-semibold num-tabular">
            {balanceEth} <span className="text-2xl text-ink-500">ETH</span>
          </div>
          <div className="text-sm text-ink-300 mt-2">
            in{' '}
            <a
              href="https://arbiscan.io/address/0x0000000000000000000000000000000000000DA0"
              className="hover:text-ink-100 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Arbitrum: Intermediary Frozen Wallet
            </a>
          </div>
        </div>
        <div className={`px-3 py-1 rounded text-xs font-medium ${recovered ? 'bg-accent-warn/20 text-accent-warn' : 'bg-accent-ok/20 text-accent-ok'}`}>
          {recovered ? '⚠ Wallet has moved' : '● Frozen — last seen intact'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total inflows" value={`${inflowEth} ETH`} />
        <Stat label="Total outflows" value={`${outflowEth} ETH`} />
        <Stat
          label="Last movement"
          value={
            props.last_movement
              ? formatRelative(props.last_movement.block_timestamp)
              : 'no movement yet'
          }
          sub={
            props.last_movement
              ? formatUtc(props.last_movement.block_timestamp)
              : undefined
          }
        />
      </div>

      {props.last_movement && (
        <div className="mt-6 pt-6 border-t border-ink-800 text-sm">
          <div className="text-ink-500 mb-1">Last tx</div>
          <a
            href={explorerTx(props.last_movement.chain, props.last_movement.transaction_hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-accent hover:text-cyan-300"
          >
            {shortHash(props.last_movement.transaction_hash)}
          </a>{' '}
          <span className="text-ink-500">·</span>{' '}
          <span className="num-tabular">
            {formatEthFromWei(props.last_movement.amount_wei)} ETH
          </span>{' '}
          <span className="text-ink-500">{props.last_movement.direction}</span>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">{label}</div>
      <div className="text-xl font-medium num-tabular">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-1 num-tabular">{sub}</div>}
    </div>
  );
}
