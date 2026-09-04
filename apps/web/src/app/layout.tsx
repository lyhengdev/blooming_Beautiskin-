import type { Metadata } from 'next';
import { Battambang, Nunito } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

// Nunito — rounded, playful display font that matches the brand's kawaii logo style
const nunito = Nunito({
  weight: ['400', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
});

// Battambang — Khmer + Latin body copy
const battambang = Battambang({
  weight: ['400', '700'],
  subsets: ['latin', 'khmer'],
  display: 'swap',
  variable: '--font-battambang',
});

export const metadata: Metadata = {
  title: {
    default: 'Blooming Beauty Skin — Authentic K-Beauty & Cosmetics in Cambodia',
    template: '%s | Blooming Beauty Skin',
  },
  description:
    'Shop authentic Korean and Japanese skincare & cosmetics in Cambodia. Cleansers, serums, moisturizers, SPF & more. Free shipping over $30.',
  keywords: [
    'skincare', 'Cambodia', 'Korean skincare', 'J-beauty', 'K-beauty',
    'cosmetics', 'cleanser', 'serum', 'moisturizer', 'SPF', 'sunscreen',
    'COSRX', 'Innisfree', 'Beauty of Joseon', 'Hada Labo',
    'Blooming Beauty Skin', 'ប្លូមីង ប្យូទី ស្គីន',
  ],
  authors: [{ name: 'Blooming Beauty Skin' }],
  openGraph: {
    title: 'Blooming Beauty Skin',
    description: 'Authentic Korean & Japanese skincare & cosmetics in Cambodia',
    type: 'website',
    locale: 'en_US',
    siteName: 'Blooming Beauty Skin',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} ${battambang.variable}`}
    >
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
