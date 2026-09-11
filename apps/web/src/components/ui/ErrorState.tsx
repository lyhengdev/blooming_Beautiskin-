import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function ErrorState({
  icon: Icon = AlertTriangle,
  title,
  message,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-14 text-center">
      <Icon className="mx-auto h-10 w-10 text-red-300" />
      <p className="mt-3 text-lg font-bold text-red-700">{title}</p>
      {message && <p className="mx-auto mt-2 max-w-md text-sm text-red-600">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-5 btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
