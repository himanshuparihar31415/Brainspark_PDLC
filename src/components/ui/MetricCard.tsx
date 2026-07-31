import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  sparkline?: number[];
  onClick?: () => void;
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
  neutral: 'bg-slate-300',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  status,
  sparkline,
  onClick,
  className = '',
}) => {
  const Tag = onClick ? 'button' : 'div';
  const trendUp = (trend ?? 0) >= 0;

  return (
    <Tag
      onClick={onClick}
      className={`material-acrylic elevation-rest reveal-card card-interactive rounded-2xl border border-white/60 p-[var(--card-padding)] text-left ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status && <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />}
          <span className="type-caption font-bold uppercase tracking-wider text-slate-400">{label}</span>
        </div>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-black tracking-tight text-slate-900">{value}</span>
        {unit && <span className="type-caption text-slate-500">{unit}</span>}
      </div>

      {(trend !== undefined || sparkline) && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
          {trend !== undefined && (
            <span className={`flex items-center gap-1 type-caption font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendUp ? '+' : ''}{trend.toFixed(1)}%
              {trendLabel && <span className="ml-1 font-normal text-slate-400">{trendLabel}</span>}
            </span>
          )}
          {sparkline && sparkline.length > 1 && (
            <div className="flex items-end gap-px">
              {sparkline.map((v, i) => {
                const max = Math.max(...sparkline);
                const h = max > 0 ? (v / max) * 18 : 2;
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-sm ${i === sparkline.length - 1 ? 'bg-indigo-500' : 'bg-slate-200'}`}
                    style={{ height: `${Math.max(h, 2)}px` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </Tag>
  );
};
