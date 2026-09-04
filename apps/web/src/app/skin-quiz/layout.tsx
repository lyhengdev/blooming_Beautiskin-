import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Skin Quiz - Find Your Perfect Routine',
  description:
    'Take our free skin quiz to get personalized Korean skincare recommendations based on your skin type and concerns.',
  openGraph: {
    title: 'Skin Quiz | Blooming Beauty Skin',
    description: 'Get personalized skincare recommendations',
  },
};

export default function SkinQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
