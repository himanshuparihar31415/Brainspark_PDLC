import React from 'react';
import { BreakdownRow } from '../../types';
import { X, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export interface BreakdownSection {
  /** e.g. "By tenant", "By module" — the axis this section ranks on. */
  title: string;
  rows: BreakdownRow[];
}

interface BreakdownModalProps {
  open: boolean;
  title: string;
  /** Echoes the active scope so it is never ambiguous what is being totalled. */
  scopeLabel: string;
  total: number;
  totalLabel: string;
  /** Pre-formatted values keep currency vs. token rendering out of this component. */
  format: (value: number) => string;
  sections: BreakdownSection[];
  trend?: { current: number; previous: number; label: string };
  footerLink?: { label: string; onClick: () => void };
  emptyMessage: string;
  onClose: () => void;
}

const RankedRows: React.FC<{ rows: BreakdownRow[]; format: (v: number) => string }> = ({
  rows,
  format,
}) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;

  return (
    <div className="space-y-1.5">
      {rows.map((row, idx) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-6 shrink-0 font-mono text-[10px] text-slate-400">#{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-semibold text-slate-800">{row.label}</span>
              <span className="shrink-0 font-mono text-xs text-slate-900">{format(row.value)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[10px] text-slate-400">
                {((row.value / total) * 100).toFixed(1)}%
              </span>
            </div>
            {row.sublabel && <div className="mt-0.5 text-[10px] text-slate-400">{row.sublabel}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Shared shell for the cost and token breakdowns. These exist as modals rather
 * than screens because no screen owns spend or token data — unlike people or
 * projects, which have their own views to redirect into.
 */
export const BreakdownModal: React.FC<BreakdownModalProps> = ({
  open,
  title,
  scopeLabel,
  total,
  totalLabel,
  format,
  sections,
  trend,
  footerLink,
  emptyMessage,
  onClose,
}) => {
  if (!open) return null;

  const hasData = sections.some((s) => s.rows.length > 0) && total > 0;
  const delta = trend && trend.previous !== 0 ? ((trend.current - trend.previous) / trend.previous) * 100 : 0;
  const up = delta >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">{title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {scopeLabel}
              </span>
              {hasData && (
                <span className="text-[11px] text-slate-500">
                  {format(total)} {totalLabel}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {!hasData ? (
            <div className="py-10 text-center text-xs text-slate-500">{emptyMessage}</div>
          ) : (
            <div className="space-y-6">
              {trend && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {trend.label}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-slate-900">
                      {format(trend.current)}{' '}
                      <span className="text-xs font-medium text-slate-400">
                        from {format(trend.previous)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                      up ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {up ? '+' : ''}
                    {delta.toFixed(1)}%
                  </span>
                </div>
              )}

              {sections
                .filter((s) => s.rows.length > 0)
                .map((section) => (
                  <div key={section.title}>
                    <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {section.title}
                    </h3>
                    <RankedRows rows={section.rows} format={format} />
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-3.5">
          {footerLink && hasData ? (
            <button
              onClick={footerLink.onClick}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800"
            >
              {footerLink.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
