import React from 'react';
import { Users, DollarSign, Cpu, TrendingUp, TrendingDown, ChevronRight, Filter } from 'lucide-react';
import { formatTokens, formatUsd } from '../../data/modules';

export type TileKey = 'headcount' | 'cost' | 'tokens' | 'completion';

/**
 * How a tile behaves when clicked. The rule: if the detail is a filtered
 * version of a screen that already exists, redirect there; if it is a breakdown
 * with no home of its own, open a modal. Project Admins are the exception —
 * their detail is co-located in the strip below, so their tiles filter in place.
 */
export type TileAction = 'redirect' | 'modal' | 'filter';

interface TileSpec {
  key: TileKey;
  label: string;
  action: TileAction;
}

interface RollupTilesProps {
  headcount: number;
  cost: number;
  costPrev: number;
  budget?: number;
  tokens: number;
  completion: number;
  scopeNoun: string;
  specs: Record<TileKey, TileAction>;
  activeFilter: TileKey | null;
  onTileClick: (key: TileKey) => void;
}

const ACTION_HINT: Record<TileAction, string> = {
  redirect: 'Opens the full screen',
  modal: 'Opens a breakdown',
  filter: 'Filters the strip below',
};

const Tile: React.FC<{
  spec: TileSpec;
  value: string;
  caption: string;
  badge?: React.ReactNode;
  footer: React.ReactNode;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}> = ({ spec, value, caption, badge, footer, icon: Icon, active, onClick }) => (
  <button
    onClick={onClick}
    title={ACTION_HINT[spec.action]}
    className={`glass-panel group relative cursor-pointer overflow-hidden rounded-2xl border p-5 text-left transition-all ${
      active
        ? 'border-indigo-500/50 ring-2 ring-indigo-600/20'
        : 'border-white/60 hover:border-indigo-200/80'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500">{spec.label}</span>
      {badge ?? (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>

    <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{caption}</div>

    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] font-semibold">
      {footer}
      {spec.action === 'filter' ? (
        <Filter
          className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`}
        />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
      )}
    </div>
  </button>
);

export const RollupTiles: React.FC<RollupTilesProps> = ({
  headcount,
  cost,
  costPrev,
  budget,
  tokens,
  completion,
  scopeNoun,
  specs,
  activeFilter,
  onTileClick,
}) => {
  const costDelta = costPrev === 0 ? 0 : ((cost - costPrev) / costPrev) * 100;
  const costUp = costDelta >= 0;
  const overBudget = budget !== undefined && cost > budget;
  const onTrack = completion >= 60;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        spec={{ key: 'headcount', label: 'Team headcount', action: specs.headcount }}
        value={`${headcount} people`}
        caption={`assigned in ${scopeNoun}`}
        icon={Users}
        active={activeFilter === 'headcount'}
        onClick={() => onTileClick('headcount')}
        footer={
          <span className="flex items-center gap-1 text-emerald-600">
            <TrendingUp className="h-3 w-3" /> +12% vs last month
          </span>
        }
      />

      <Tile
        spec={{ key: 'cost', label: 'Total cost', action: specs.cost }}
        value={formatUsd(cost)}
        caption="AI spend, last 30 days"
        icon={DollarSign}
        active={activeFilter === 'cost'}
        onClick={() => onTileClick('cost')}
        badge={
          <span
            className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
              costUp
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {costUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {costUp ? '+' : ''}
            {costDelta.toFixed(1)}%
          </span>
        }
        footer={
          <span className={overBudget ? 'text-rose-600' : 'text-slate-500'}>
            {budget !== undefined ? `Budget: ${formatUsd(budget)}` : `vs ${formatUsd(costPrev)} prior`}
          </span>
        }
      />

      <Tile
        spec={{ key: 'tokens', label: 'Tokens consumed', action: specs.tokens }}
        value={formatTokens(tokens)}
        caption="across all invocations"
        icon={Cpu}
        active={activeFilter === 'tokens'}
        onClick={() => onTileClick('tokens')}
        footer={<span className="font-medium text-indigo-600">99.4% Gemini 2.5 Pro/Flash</span>}
      />

      <Tile
        spec={{ key: 'completion', label: 'Overall completion', action: specs.completion }}
        value={`${completion}%`}
        caption="of planned work"
        icon={TrendingUp}
        active={activeFilter === 'completion'}
        onClick={() => onTileClick('completion')}
        badge={
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
              onTrack
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {onTrack ? 'On track' : 'Behind'}
          </span>
        }
        footer={
          <div className="mr-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${onTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${completion}%` }}
            />
          </div>
        }
      />
    </div>
  );
};
