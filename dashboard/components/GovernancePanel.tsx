'use client';

import { Sparkline } from '@indexing-co/charts-core';
import { formatRelative, formatUtc } from '@/lib/format';
import type { GovernanceProposal } from '@/lib/db';

const STATE_STYLE: Record<string, string> = {
  active: 'bg-accent-ok/20 text-accent-ok',
  pending: 'bg-accent-warn/20 text-accent-warn',
  passed: 'bg-accent-ok/20 text-accent-ok',
  rejected: 'bg-accent-danger/20 text-accent-danger',
  executed: 'bg-accent/20 text-accent',
  canceled: 'bg-ink-800 text-ink-500',
};

const SOURCE_LABEL: Record<string, string> = {
  snapshot: 'Snapshot',
  arbitrum_core: 'Arbitrum Core Governor',
  arbitrum_treasury: 'Arbitrum Treasury Governor',
  forum: 'Forum',
  forum_post: 'Forum',
  tweet: 'Tweet',
  onchain: 'On-chain',
  site: 'Site',
};

export function GovernancePanel({
  proposals,
  title = 'Recovery proposals',
  subtitle,
}: {
  proposals: GovernanceProposal[];
  title?: string;
  subtitle?: string;
}) {
  if (proposals.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div className="border border-ink-800 rounded-lg bg-ink-900 px-6 py-12 text-center text-ink-500 text-sm">
          Nothing indexed yet for this category.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-xs text-ink-500 num-tabular">{proposals.length} entries</div>
      </div>

      <div className="space-y-3">
        {proposals.map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      </div>
    </section>
  );
}

function ProposalCard({ proposal }: { proposal: GovernanceProposal }) {
  const stateClass = STATE_STYLE[proposal.state] ?? 'bg-ink-800 text-ink-300';
  const sourceLabel = SOURCE_LABEL[proposal.source] ?? proposal.source;
  const forVotes = proposal.votes_for_wei ? Number(BigInt(proposal.votes_for_wei) / BigInt(1e18)) : 0;
  const againstVotes = proposal.votes_against_wei
    ? Number(BigInt(proposal.votes_against_wei) / BigInt(1e18))
    : 0;
  const total = forVotes + againstVotes;
  const forPct = total > 0 ? Math.round((forVotes / total) * 100) : null;

  return (
    <div className="border border-ink-800 rounded-lg bg-ink-900 p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${stateClass}`}>
              {proposal.state}
            </span>
            <span className="text-xs text-ink-500">{sourceLabel}</span>
            {proposal.space && proposal.source === 'snapshot' && (
              <span className="text-xs text-ink-500">· {proposal.space}</span>
            )}
          </div>
          <h3 className="font-medium text-ink-100 leading-snug">
            {proposal.url ? (
              <a
                href={proposal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-green transition-colors"
              >
                {proposal.title}
              </a>
            ) : (
              proposal.title
            )}
          </h3>
          {proposal.proposer && (
            <div className="text-xs text-ink-500 mt-1">by {proposal.proposer}</div>
          )}
        </div>
        {forPct !== null && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-ink-500 uppercase tracking-wider">For</div>
              <div className="text-lg font-medium num-tabular text-brand-green">{forPct}%</div>
            </div>
            <Sparkline
              data={[againstVotes, forVotes]}
              width={60}
              height={24}
              color="#4AF120"
            />
          </div>
        )}
      </div>

      {(proposal.start_at || proposal.end_at) && (
        <div className="flex gap-4 mt-3 text-xs text-ink-500 num-tabular">
          {proposal.start_at && <span>Start: {formatUtc(proposal.start_at)}</span>}
          {proposal.end_at && (
            <span>
              End: {formatUtc(proposal.end_at)}{' '}
              <span className="text-ink-300">({formatRelative(proposal.end_at)})</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
