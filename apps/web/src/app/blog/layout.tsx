import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Skincare Blog',
  description:
    'Expert skincare tips, K-beauty routines, ingredient guides, and product reviews from Blooming Beauty Skin.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
