/** @type {import('next').NextConfig} */
const nextConfig = {
  // DO NOT use the `env` block to expose DATABASE_URL — that inlines the
  // literal value into ALL bundles at build time, including any client
  // component that imports it transitively. Server components read
  // process.env.DATABASE_URL directly via lib/db.ts (server-only by virtue
  // of the `pg` import being server-only). That's the correct pattern.
};

export default nextConfig;
