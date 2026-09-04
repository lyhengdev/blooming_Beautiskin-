'use client';

import { useEffect } from 'react';
import { Flower2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mx-auto mb-5">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-heading font-extrabold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          An unexpected error occurred in the admin panel. You can try reloading this page or return to the dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="btn-primary px-5 py-2.5 text-sm">
            Try Again
          </button>
          <button onClick={() => router.push('/admin')} className="btn-secondary px-5 py-2.5 text-sm">
            Dashboard
          </button>
        </div>
        {error.digest && (
          <p className="mt-4 text-[10px] text-gray-400 font-mono">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
