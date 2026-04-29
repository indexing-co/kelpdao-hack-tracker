#!/usr/bin/env node
/**
 * Pre-deploy guard: refuses to proceed if any address in src/constants.ts
 * is still PENDING. Add to CI / deploy hooks.
 *
 * Usage: node scripts/check-addresses-verified.mjs
 *
 * Exits 0 if all entries are VERIFIED or VERIFIED_PER_AIP.
 * Exits 1 with a list of pending entries otherwise.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// We dynamically import the TS file via tsx loader. If tsx isn't available,
// users should `pnpm install` at repo root which provides it.
try {
  register('tsx/esm', pathToFileURL('./'));
} catch {
  // Fall back to dynamic import; will fail informatively if tsx missing
}

let assertAllAddressesVerified;
try {
  ({ assertAllAddressesVerified } = await import('../src/constants.ts'));
} catch (err) {
  console.error('Could not load src/constants.ts. Make sure tsx is installed:');
  console.error('  pnpm install');
  console.error('Original error:', err.message);
  process.exit(2);
}

try {
  assertAllAddressesVerified();
  console.log('✓ All watched addresses are VERIFIED. Safe to deploy.');
  process.exit(0);
} catch (err) {
  console.error('✗ Address verification failed:');
  console.error(err.message);
  console.error('\nUpdate docs/addresses.md and src/constants.ts before deploying.');
  process.exit(1);
}
