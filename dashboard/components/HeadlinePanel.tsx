'use client';

import { KPICard, StatusDot } from '@indexing-co/charts-core';
import { colors } from '@/lib/brand';
import {
  formatEthFromWei,
  formatRelative,
  formatUtc,
  shortHash,
  explorerTx,
} from '@/lib/format';
import type { WalletFlow } from '@/lib/db';

interface Props {
  current_balance_wei: string;
  total_inflows_wei: string;
  total_outflows_wei: string;
  last_movement: WalletFlow | null;
}

export function HeadlinePanel(props: Props) {
  const balanceEth = formatEthFromWei(props.current_balance_wei, 6);
  const inflowEth = formatEthFromWei(props.total_inflows_wei, 4);
  const outflowEth = formatEthFromWei(props.total_outflows_wei, 4);
  const moved = props.current_balance_wei !== props.total_inflows_wei;

  const sharedKpiStyles = {
    value: { color: colors.ink100, fontFamily: 'Inter, system-ui, sans-serif' },
    label: { color: colors.ink500, textTransform: 'uppercase' as const },
  };

  return (
    <section className="border border-ink-800 rounded-lg bg-ink-900 p-8">
      <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">
            Currently frozen on Arbitrum
          </div>
          <div className="text-5xl font-semibold num-tabular text-ink-100">
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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-ink-800">
          <StatusDot status={moved ? 'warning' : 'success'} />
          <span className="text-sm text-ink-100">
            {moved ? 'Wallet has moved' : 'Frozen — last seen intact'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-ink-800 rounded-lg p-4 bg-ink-950">
          <KPICard
            label="Total inflows"
            value={inflowEth}
            suffix=" ETH"
            variant="compact"
            styles={sharedKpiStyles}
          />
        </div>
        <div className="border border-ink-800 rounded-lg p-4 bg-ink-950">
          <KPICard
            label="Total outflows"
            value={outflowEth}
            suffix=" ETH"
            variant="compact"
            styles={sharedKpiStyles}
          />
        </div>
        <div className="border border-ink-800 rounded-lg p-4 bg-ink-950">
          <KPICard
            label="Last movement"
            value={
              props.last_movement
                ? formatRelative(props.last_movement.block_timestamp)
                : 'no movement yet'
            }
            variant="compact"
            styles={sharedKpiStyles}
          />
          {props.last_movement && (
            <div className="text-xs text-ink-500 mt-1 num-tabular">
              {formatUtc(props.last_movement.block_timestamp)}
            </div>
          )}
        </div>
      </div>

      {props.last_movement && (
        <div className="mt-6 pt-6 border-t border-ink-800 text-sm">
          <div className="text-ink-500 mb-1">Last tx</div>
          <a
            href={explorerTx(props.last_movement.chain, props.last_movement.transaction_hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-brand-green hover:opacity-80"
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
