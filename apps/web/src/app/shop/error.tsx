'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Shop error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Shop is temporarily unavailable</h1>
          <p className="text-gray-500 mb-6">
            We are having trouble loading products. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-primary">Retry</button>
            <Link href="/" className="btn-secondary">Go Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
