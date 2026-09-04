import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join Blooming Beauty Skin for exclusive deals and order tracking.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
