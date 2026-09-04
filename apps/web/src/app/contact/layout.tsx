import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Blooming Beauty Skin. We ship authentic Korean and Japanese skincare across Cambodia.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
