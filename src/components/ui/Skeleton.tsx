import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  lines?: number;
  animate?: boolean;
}

const BASE = 'bg-slate-200/70 rounded';
const PULSE = 'animate-pulse';

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  lines = 1,
  animate = true,
}) => {
  const animation = animate ? PULSE : '';

  if (variant === 'circular') {
    return <div className={`${BASE} ${animation} rounded-full ${className}`} />;
  }

  if (variant === 'rectangular') {
    return <div className={`${BASE} ${animation} rounded-xl ${className}`} />;
  }

  if (variant === 'card') {
    return (
      <div className={`material-acrylic rounded-2xl border border-white/60 p-5 ${animation} ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`${BASE} h-8 w-8 rounded-full`} />
          <div className="flex-1 space-y-2">
            <div className={`${BASE} h-3 w-3/4 rounded`} />
            <div className={`${BASE} h-2.5 w-1/2 rounded`} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className={`${BASE} h-2.5 w-full rounded`} />
          <div className={`${BASE} h-2.5 w-5/6 rounded`} />
          <div className={`${BASE} h-2.5 w-2/3 rounded`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${animation} ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${BASE} h-3 rounded`}
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
};

export const SkeletonGroup: React.FC<{ count: number; variant?: SkeletonProps['variant']; className?: string }> = ({
  count,
  variant = 'card',
  className = '',
}) => (
  <div className={`grid gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant={variant} />
    ))}
  </div>
);
