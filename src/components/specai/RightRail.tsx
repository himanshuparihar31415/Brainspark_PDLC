import React, { useState } from 'react';
import { SpecAiState } from '../../types/specai';
import { openQuestionsIn } from '../../data/specai';
import { BriefPanel } from './BriefPanel';
import { CopilotPanel } from './CopilotPanel';

type Tab = 'agent' | 'brief';

/**
 * Two tabs, because there are only two things to do here: talk to the agent, or
 * read what it currently understands. The brief moves as you talk — settling a
 * question marks it out of date and folds the answer in on the next refresh.
 */
export const RightRail: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange }) => {
  const [tab, setTab] = useState<Tab>('brief');

  const openCount = openQuestionsIn(state).length;
  const archOpen = openQuestionsIn(state, 'Architecture').length > 0;

  const tabs: { key: Tab; label: string; badge?: string; alert?: boolean }[] = [
    { key: 'agent', label: 'Agent' },
    {
      key: 'brief',
      label: 'Project brief',
      badge: state.brief
        ? state.brief.stale
          ? '!'
          : openCount > 0
          ? String(openCount)
          : `v${state.brief.version}`
        : undefined,
      alert: state.brief?.stale || archOpen,
    },
  ];

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-[30rem] lg:h-full lg:w-72 xl:w-96">
      <div className="flex shrink-0 border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-[10.5px] font-bold transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {t.label}
            {t.badge && (
              <span
                className={`rounded px-1 py-0.5 text-[8px] font-bold ${
                  t.alert
                    ? 'bg-amber-500 text-white'
                    : tab === t.key
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'agent' ? (
        <CopilotPanel
          state={state}
          disabled={disabled}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      ) : (
        <BriefPanel state={state} disabled={disabled} onTalkToAgent={() => setTab('agent')} />
      )}
    </aside>
  );
};
