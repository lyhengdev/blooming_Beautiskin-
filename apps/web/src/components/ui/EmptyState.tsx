import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function EmptyState({
  icon: Icon = Package,
  title,
  message,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-blush-100 bg-blush-50 px-6 py-16 text-center">
      <Icon className="mx-auto h-12 w-12 text-blush-300" />
      <p className="mt-3 text-lg font-bold text-gray-800">{title}</p>
      {message && <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{message}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-5 inline-flex btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
