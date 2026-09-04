import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Blooming Beauty Skin - your trusted source for authentic Korean and Japanese skincare in Cambodia.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
