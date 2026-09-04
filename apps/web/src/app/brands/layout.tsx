import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brands',
  description: 'Browse all skincare and cosmetics brands available at Blooming Beauty Skin.',
};

export default function BrandsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
