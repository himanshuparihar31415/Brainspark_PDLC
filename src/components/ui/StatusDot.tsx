import React from 'react';

export type AgentState = 'idle' | 'running' | 'success' | 'error' | 'waiting' | 'offline';

const STATE_STYLES: Record<AgentState, { bg: string; ring: string; pulse: boolean }> = {
  idle: { bg: 'bg-slate-400', ring: 'ring-slate-200', pulse: false },
  running: { bg: 'bg-indigo-500', ring: 'ring-indigo-200', pulse: true },
  success: { bg: 'bg-emerald-500', ring: 'ring-emerald-200', pulse: false },
  error: { bg: 'bg-rose-500', ring: 'ring-rose-200', pulse: false },
  waiting: { bg: 'bg-amber-500', ring: 'ring-amber-200', pulse: true },
  offline: { bg: 'bg-slate-300', ring: 'ring-slate-100', pulse: false },
};

const STATE_LABELS: Record<AgentState, string> = {
  idle: 'Idle',
  running: 'Running',
  success: 'Healthy',
  error: 'Error',
  waiting: 'Awaiting',
  offline: 'Offline',
};

interface StatusDotProps {
  state: AgentState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZES = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3 w-3' };

export const StatusDot: React.FC<StatusDotProps> = ({ state, size = 'md', showLabel, className = '' }) => {
  const { bg, ring, pulse } = STATE_STYLES[state];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={STATE_LABELS[state]}>
      <span className={`relative inline-block rounded-full ${SIZES[size]} ${bg} ring-2 ${ring}`}>
        {pulse && (
          <span className={`absolute inset-0 animate-ping rounded-full ${bg} opacity-40`} />
        )}
      </span>
      {showLabel && (
        <span className="type-caption font-medium text-slate-600">{STATE_LABELS[state]}</span>
      )}
    </span>
  );
};
