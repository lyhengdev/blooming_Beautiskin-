import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop All Products',
  description:
    'Browse our collection of authentic Korean and Japanese skincare. Cleansers, toners, serums, moisturizers, sunscreens and masks.',
  openGraph: {
    title: 'Shop | Blooming Beauty Skin',
    description: 'Authentic K-beauty & J-beauty products in Cambodia',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
