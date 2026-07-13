import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'TableFlow: From scan to paid, in one tap',
    template: '%s | TableFlow',
  },
  description:
    'QR-powered ordering and operations for restaurants and bars. Guest ordering, kitchen display, and Stripe payments. No POS integration or app downloads.',
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'TableFlow: From scan to paid, in one tap',
    description:
      'QR-powered ordering and operations for restaurants and bars. Guest ordering, kitchen display, and Stripe payments. No POS integration or app downloads.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-flagship-background">
      <body className={`${inter.variable} bg-flagship-background text-flagship-on-surface antialiased`}>{children}</body>
    </html>
  );
}
