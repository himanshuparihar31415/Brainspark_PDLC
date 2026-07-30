import React, { useState } from 'react';
import { SpecAiState } from '../../types/specai';
import { openQuestionsIn } from '../../data/specai';
import { BriefPanel } from './BriefPanel';
import { CopilotPanel } from './CopilotPanel';
import { QuestionQueue } from './QuestionQueue';

type Tab = 'copilot' | 'brief' | 'questions';

/**
 * The reading rail. Three views of the same corpus: something to ask, the
 * synthesized reading, and what the reading could not settle. Tabbed rather than
 * stacked because a brief long enough to be comprehensive would otherwise fight
 * the board for vertical space.
 */
export const RightRail: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange }) => {
  const [tab, setTab] = useState<Tab>('brief');

  const openCount = openQuestionsIn(state).length;
  const briefBadge = state.brief ? (state.brief.stale ? '!' : `v${state.brief.version}`) : undefined;

  const tabs: { key: Tab; label: string; badge?: string; alert?: boolean }[] = [
    { key: 'copilot', label: 'Copilot' },
    { key: 'brief', label: 'Brief', badge: briefBadge, alert: state.brief?.stale },
    {
      key: 'questions',
      label: 'Questions',
      badge: openCount > 0 ? String(openCount) : undefined,
      alert: openQuestionsIn(state, 'Architecture').length > 0,
    },
  ];

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-96 lg:w-64 xl:w-80">
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

      {tab === 'copilot' && (
        <CopilotPanel
          state={state}
          disabled={disabled}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      )}
      {tab === 'brief' && <BriefPanel state={state} disabled={disabled} />}
      {tab === 'questions' && <QuestionQueue state={state} disabled={disabled} />}
    </aside>
  );
};
