/** @type {import('next').NextConfig} */
const nextConfig = {
  // Read DATABASE_URL_DIRECT (or fall back to DATABASE_URL) at build/runtime.
  // The Indexing Co pipeline writes through DATABASE_URL_DIRECT; the dashboard
  // uses the pooled DATABASE_URL for app reads.
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
