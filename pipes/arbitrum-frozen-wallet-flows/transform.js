/**
 * Pipe: arbitrum-frozen-wallet-flows
 *
 * Watches native ETH movement on Arbitrum One for the KelpDAO recovery's
 * critical wallets. Native ETH transfers are tx-level (no log event), so we
 * iterate every tx in every block where these addresses appear as from/to.
 *
 * Watched addresses (lowercase for comparison):
 *   - 0x0000000000000000000000000000000000000DA0  Arbitrum: Intermediary Frozen Wallet
 *   - 0x5d3919F12bCc35c26Eee5F8226A9bee90c257Ccc  KelpDAO Exploiter 1 (Arbitrum)
 *   - 0xf228130ce4fAB082C7D5522c90833cec83A9C15e  Recovery 2-of-3 Safe (per AIP)
 *
 * Output: rows in `wallet_flows` table.
 *   - is_headline=true when the watched address is the intermediary frozen wallet
 *   - direction = 'in' if watched is the recipient, 'out' if sender
 */
function transform(block) {
  const watched = {
    '0x0000000000000000000000000000000000000da0': {
      label: 'Arbitrum: Intermediary Frozen Wallet',
      headline: true,
    },
    '0x5d3919f12bcc35c26eee5f8226a9bee90c257ccc': {
      label: 'KelpDAO Exploiter 1 (Arbitrum)',
      headline: false,
    },
    '0xf228130ce4fab082c7d5522c90833cec83a9c15e': {
      label: 'Recovery Safe (2-of-3, per AIP)',
      headline: false,
    },
  };

  const results = [];
  const txs = block.transactions || [];
  // block.timestamp is a hex string of seconds since epoch on EVM chains.
  const blockTsSec = Number(BigInt(block.timestamp || '0x0'));
  const blockTimestamp = new Date(blockTsSec * 1000).toISOString();
  const blockNum = Number(block.number);

  for (const tx of txs) {
    const from = (tx.from || '').toLowerCase();
    const to = (tx.to || '').toLowerCase();
    const valueHex = tx.value || '0x0';
    const valueWei = BigInt(valueHex);

    if (valueWei === 0n) continue;

    const fromMatch = watched[from];
    const toMatch = watched[to];

    if (fromMatch) {
      results.push({
        chain: 'arbitrum',
        block: blockNum,
        block_timestamp: blockTimestamp,
        transaction_hash: tx.hash,
        log_index: -1,
        from_address: from,
        to_address: to,
        token_address: null,
        amount_wei: valueWei.toString(),
        direction: 'out',
        watched_address: from,
        is_headline: fromMatch.headline,
      });
    }

    if (toMatch) {
      results.push({
        chain: 'arbitrum',
        block: blockNum,
        block_timestamp: blockTimestamp,
        transaction_hash: tx.hash,
        log_index: -1,
        from_address: from,
        to_address: to,
        token_address: null,
        amount_wei: valueWei.toString(),
        direction: 'in',
        watched_address: to,
        is_headline: toMatch.headline,
      });
    }
  }

  return results;
}
