#!/usr/bin/env node
/**
 * Snapshot poller — fetches recovery-related proposals across the DAOs
 * involved in the KelpDAO recovery and upserts them into Neon.
 *
 * Run: pnpm tsx scripts/sync-snapshot.mjs    (or node scripts/sync-snapshot.mjs)
 *
 * Designed to be idempotent. Schedule via cron (Render cron job, Vercel cron,
 * or GitHub Actions on a 5-min schedule).
 */

import { Pool } from 'pg';
import 'dotenv/config';

const SNAPSHOT_API = 'https://hub.snapshot.org/graphql';

// DAOs whose Snapshot spaces may host recovery proposals
const SPACES = [
  'arbitrumfoundation.eth',
  'aave.eth',
  'kelpdao.eth',
  'etherfi-dao.eth',
  'snapshot.mantle.xyz',
  'lido-snapshot.eth',
  'compound-finance.eth',
];

// Keywords that flag a proposal as recovery-related
const KEYWORDS = [
  'rseth',
  'kelpdao',
  'kelp dao',
  'kelp ',
  'frozen eth',
  'rseth incident',
  'rseth recovery',
  'restore rseth',
  'defi united',
];

const QUERY = `
  query Proposals($spaces: [String]!) {
    proposals(
      first: 50
      where: { space_in: $spaces }
      orderBy: "created"
      orderDirection: desc
    ) {
      id
      title
      body
      state
      space { id }
      author
      start
      end
      created
      scores
      scores_total
      quorum
      choices
      link
    }
  }
`;

function isRelevant(title, body) {
  const text = `${title} ${body || ''}`.toLowerCase();
  return KEYWORDS.some((k) => text.includes(k));
}

async function fetchSnapshot() {
  const res = await fetch(SNAPSHOT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { spaces: SPACES } }),
  });
  if (!res.ok) throw new Error(`Snapshot HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Snapshot GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data.proposals;
}

function toScore(scores, choices, label) {
  // Snapshot proposals can use any choice labels. Try common patterns.
  const idx = (choices || []).findIndex((c) => (c || '').toLowerCase().includes(label));
  if (idx === -1) return null;
  const v = scores?.[idx];
  if (typeof v !== 'number') return null;
  // Convert to wei-equivalent (Snapshot scores are already in token units).
  // We store them as-is in the wei column for simplicity; downstream display
  // formats per-DAO.
  return BigInt(Math.floor(v * 1e18)).toString();
}

async function upsertProposal(pool, p) {
  const id = `snapshot:${p.id}`;
  const url = p.link || `https://snapshot.org/#/${p.space.id}/proposal/${p.id}`;
  const startAt = p.start ? new Date(p.start * 1000).toISOString() : null;
  const endAt = p.end ? new Date(p.end * 1000).toISOString() : null;

  // Map Snapshot state to our schema's enum-ish strings
  const stateMap = { pending: 'pending', active: 'active', closed: 'passed' };
  // closed could be passed or rejected — refine later by looking at scores
  let state = stateMap[p.state] ?? p.state;
  if (p.state === 'closed' && p.scores && p.scores.length >= 2) {
    state = p.scores[0] > p.scores[1] ? 'passed' : 'rejected';
  }

  const votesFor = toScore(p.scores, p.choices, 'for') ?? toScore(p.scores, p.choices, 'yes');
  const votesAgainst = toScore(p.scores, p.choices, 'against') ?? toScore(p.scores, p.choices, 'no');
  const votesAbstain = toScore(p.scores, p.choices, 'abstain');
  const quorum = p.quorum ? BigInt(Math.floor(p.quorum * 1e18)).toString() : null;

  await pool.query(
    `INSERT INTO governance_proposals
       (id, source, space, title, description, url, state,
        votes_for_wei, votes_against_wei, votes_abstain_wei, quorum_wei,
        proposer, start_at, end_at, updated_at)
     VALUES ($1, 'snapshot', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       url = EXCLUDED.url,
       state = EXCLUDED.state,
       votes_for_wei = EXCLUDED.votes_for_wei,
       votes_against_wei = EXCLUDED.votes_against_wei,
       votes_abstain_wei = EXCLUDED.votes_abstain_wei,
       quorum_wei = EXCLUDED.quorum_wei,
       end_at = EXCLUDED.end_at,
       updated_at = now()`,
    [
      id,
      p.space.id,
      p.title,
      p.body?.slice(0, 4000) ?? null,
      url,
      state,
      votesFor,
      votesAgainst,
      votesAbstain,
      quorum,
      p.author,
      startAt,
      endAt,
    ],
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const proposals = await fetchSnapshot();
    let relevant = 0;
    let upserted = 0;
    for (const p of proposals) {
      if (!isRelevant(p.title, p.body)) continue;
      relevant++;
      await upsertProposal(pool, p);
      upserted++;
      console.log(`✓ [${p.space.id}] ${p.state.padEnd(7)} ${p.title.slice(0, 80)}`);
    }
    console.log(`\nFetched ${proposals.length} proposals across ${SPACES.length} spaces.`);
    console.log(`${relevant} matched recovery keywords. ${upserted} upserted.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
