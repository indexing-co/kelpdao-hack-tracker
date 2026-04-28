import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KelpDAO Recovery — Indexing Co Observatory',
  description:
    'Live tracker of the 30,765.67 ETH frozen on Arbitrum after the April 2026 KelpDAO exploit, plus the L1 Security Council action that froze it. Powered by Indexing Co Pipes + Neon.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
