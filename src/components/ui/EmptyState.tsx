import React from 'react';
import { Inbox, Plus, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact = false,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'} ${className}`}>
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      {icon ?? <Inbox className="h-6 w-6" />}
    </div>

    <h3 className={`mt-4 text-slate-900 ${compact ? 'type-subtitle' : 'type-title'}`}>{title}</h3>

    {description && (
      <p className="mt-2 max-w-sm type-body text-slate-500">{description}</p>
    )}

    {(actionLabel || secondaryLabel) && (
      <div className="mt-5 flex items-center gap-3">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 type-body-strong text-white elevation-rest transition-all hover:elevation-hover hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="flex items-center gap-1.5 type-body-strong text-indigo-600 hover:underline cursor-pointer"
          >
            {secondaryLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )}
  </div>
);
