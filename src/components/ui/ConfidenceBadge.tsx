import React from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

const LEVEL_CONFIG: Record<ConfidenceLevel, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
  tooltip: string;
}> = {
  high: {
    icon: ShieldCheck,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'High confidence',
    tooltip: 'AI output has strong supporting evidence and consistent signals.',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Medium confidence',
    tooltip: 'AI output has partial evidence — manual review recommended.',
  },
  low: {
    icon: HelpCircle,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    label: 'Low confidence',
    tooltip: 'AI output has weak or conflicting evidence — human validation required.',
  },
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score?: number;
  showLabel?: boolean;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  score,
  showLabel = true,
  className = '',
}) => {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <span
      title={config.tooltip}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${config.bg} ${config.border} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      {showLabel && (
        <span className={`type-caption font-bold ${config.color}`}>
          {score !== undefined ? `${Math.round(score * 100)}%` : config.label}
        </span>
      )}
    </span>
  );
};
