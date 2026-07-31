import React from 'react';
import { StatusDot, AgentState } from './StatusDot';

export interface ActivityItem {
  id: string;
  agent: string;
  action: string;
  detail?: string;
  state: AgentState;
  timestamp: string;
  module?: string;
  cost?: number;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  onItemClick?: (item: ActivityItem) => void;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  items,
  maxItems = 20,
  onItemClick,
  className = '',
}) => {
  const visible = items.slice(0, maxItems);

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="type-caption font-bold uppercase tracking-wider text-slate-400">
          Agent Activity
        </span>
        <span className="type-caption text-slate-400">
          {items.filter((i) => i.state === 'running').length} running
        </span>
      </div>

      <div className="max-h-[400px] space-y-px overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {visible.length === 0 ? (
          <div className="p-6 text-center type-body text-slate-400">No recent activity.</div>
        ) : (
          visible.map((item) => (
            <button
              key={item.id}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                onItemClick ? 'cursor-pointer hover:bg-indigo-50/40' : ''
              }`}
            >
              <StatusDot state={item.state} size="sm" className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="type-body-strong truncate text-slate-900">{item.agent}</span>
                  {item.module && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 type-caption font-medium text-slate-500">
                      {item.module}
                    </span>
                  )}
                </div>
                <div className="type-caption text-slate-500 truncate">{item.action}</div>
                {item.detail && (
                  <div className="type-caption text-slate-400 truncate mt-0.5">{item.detail}</div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="type-caption text-slate-400">{item.timestamp}</div>
                {item.cost !== undefined && (
                  <div className="type-caption font-mono font-bold text-slate-500">${item.cost.toFixed(3)}</div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
