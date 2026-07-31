import React from 'react';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface CostMeterProps {
  spent: number;
  budget: number;
  label?: string;
  trend?: number[];
  className?: string;
}

export const CostMeter: React.FC<CostMeterProps> = ({
  spent,
  budget,
  label = 'AI Spend',
  trend,
  className = '',
}) => {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = spent > budget;
  const atRisk = pct >= 80 && !overBudget;

  const barColor = overBudget
    ? 'bg-rose-500'
    : atRisk
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const textColor = overBudget
    ? 'text-rose-600'
    : atRisk
    ? 'text-amber-600'
    : 'text-emerald-600';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
          <span className="type-caption font-bold uppercase tracking-wider text-slate-400">{label}</span>
        </div>
        {(overBudget || atRisk) && (
          <span className={`flex items-center gap-1 type-caption font-bold ${textColor}`}>
            <AlertTriangle className="h-3 w-3" />
            {overBudget ? 'Over budget' : 'At risk'}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-mono text-lg font-black text-slate-900">
          ${spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="type-caption text-slate-500">
          / ${budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {trend && trend.length > 1 && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-slate-400" />
          <div className="flex items-end gap-px">
            {trend.map((v, i) => {
              const max = Math.max(...trend);
              const h = max > 0 ? (v / max) * 16 : 2;
              return (
                <div
                  key={i}
                  className={`w-1.5 rounded-sm ${i === trend.length - 1 ? barColor : 'bg-slate-200'}`}
                  style={{ height: `${Math.max(h, 2)}px` }}
                />
              );
            })}
          </div>
          <span className="type-caption text-slate-400">7d trend</span>
        </div>
      )}
    </div>
  );
};
