import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState, SpecStageKey, StoryType } from '../../types/specai';
import { relativeTime } from '../../data/modules';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ExternalLink,
  Link2,
  RefreshCw,
  Upload,
} from 'lucide-react';

const TYPE_STYLE: Record<StoryType, string> = {
  'User story': 'bg-indigo-50 text-indigo-700',
  'Technical story': 'bg-blue-50 text-blue-700',
  'Security story': 'bg-rose-50 text-rose-700',
  'Testing story': 'bg-emerald-50 text-emerald-700',
};

const STORY_TYPES: StoryType[] = [
  'User story',
  'Technical story',
  'Security story',
  'Testing story',
];

const PRIORITY_STYLE: Record<string, string> = {
  P0: 'border-rose-200 bg-rose-50 text-rose-700',
  P1: 'border-amber-200 bg-amber-50 text-amber-800',
  P2: 'border-slate-200 bg-slate-100 text-slate-600',
};

/** Stage 5 — User Stories & Jira Export. */
export const Stage5Stories: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  /** Jumps back to the linked artifact in the Architecture stage. */
  onViewSource: (stage: SpecStageKey, artifactId: string) => void;
}> = ({ state, readOnly, onViewSource }) => {
  const { connectors, reviewStaleStory, exportStoriesToJira } = useApp();

  const [typeFilter, setTypeFilter] = useState<StoryType | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [bulk, setBulk] = useState(true);
  const [assignSprint, setAssignSprint] = useState(false);
  const [mapEpics, setMapEpics] = useState(true);

  const jira = connectors.find((c) => c.id === 'conn-jira');
  const jiraReady = Boolean(jira?.activatedProject);
  const pending = state.stories.filter((s) => !s.exported).length;
  const staleCount = state.stories.filter((s) => s.stale).length;

  if (state.stories.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
        No stories yet. Finalize the module map to generate them.
      </p>
    );
  }

  const moduleNames = [...new Set(state.stories.map((s) => s.moduleName))];

  const visible = state.stories.filter((s) => {
    if (typeFilter !== 'All' && s.storyType !== typeFilter) return false;
    if (priorityFilter !== 'All' && s.priority !== priorityFilter) return false;
    if (moduleFilter !== 'All' && s.moduleName !== moduleFilter) return false;
    return true;
  });

  const countBy = <T,>(pick: (s: (typeof state.stories)[number]) => T, value: T) =>
    state.stories.filter((s) => pick(s) === value).length;

  /** A filter facet: label, live count, and whether it is the active one. */
  const Chip: React.FC<{ label: string; count?: number; active: boolean; onClick: () => void }> = ({
    label,
    count,
    active,
    onClick,
  }) => (
    <button
      onClick={onClick}
      className={`mb-1.5 mr-1.5 inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold transition-colors ${
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={active ? 'text-indigo-100' : 'text-slate-400'}>{count}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {staleCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span className="text-[11px] font-bold text-amber-900">
            {staleCount} {staleCount === 1 ? 'story traces' : 'stories trace'} to an artifact that
            changed after they were written.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Filter rail */}
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-6">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Story type
          </div>
          <div className="mt-2">
            <Chip
              label="All"
              count={state.stories.length}
              active={typeFilter === 'All'}
              onClick={() => setTypeFilter('All')}
            />
            {STORY_TYPES.map((t) => (
              <Chip
                key={t}
                label={t.replace(' story', '')}
                count={countBy((s) => s.storyType, t)}
                active={typeFilter === t}
                onClick={() => setTypeFilter(t)}
              />
            ))}
          </div>

          <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Priority
          </div>
          <div className="mt-2">
            <Chip label="All" active={priorityFilter === 'All'} onClick={() => setPriorityFilter('All')} />
            {(['P0', 'P1', 'P2'] as const).map((p) => (
              <Chip
                key={p}
                label={p}
                count={countBy((s) => s.priority, p)}
                active={priorityFilter === p}
                onClick={() => setPriorityFilter(p)}
              />
            ))}
          </div>

          <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Module
          </div>
          <div className="mt-2">
            <Chip label="All" active={moduleFilter === 'All'} onClick={() => setModuleFilter('All')} />
            {moduleNames.map((m) => (
              <Chip
                key={m}
                label={m}
                count={countBy((s) => s.moduleName, m)}
                active={moduleFilter === m}
                onClick={() => setModuleFilter(m)}
              />
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            Showing <b className="text-slate-800">{visible.length}</b> of {state.stories.length}
          </div>
        </aside>

      {/* Story list */}
      <div className="min-w-0 space-y-3">
        {visible.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
            No stories match this filter.
          </p>
        )}
        {visible.map((s) => (
          <article
            key={s.id}
            className={`rounded-2xl border bg-white p-5 ${
              s.stale ? 'border-amber-300' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  As a <span className="font-bold text-indigo-700">{s.role}</span>, I want{' '}
                  <span className="font-bold text-indigo-700">{s.goal}</span>, so that{' '}
                  <span className="font-bold text-indigo-700">{s.benefit}</span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
                    PRIORITY_STYLE[s.priority]
                  }`}
                >
                  {s.priority}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                    TYPE_STYLE[s.storyType]
                  }`}
                >
                  {s.storyType.replace(' story', '')}
                </span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                  {s.points} pts
                </span>
                {s.exported && (
                  <span className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                    <Check className="h-2.5 w-2.5" /> In Jira
                  </span>
                )}
              </div>
            </div>

            {/* Acceptance criteria — Gherkin */}
            <div className="mt-3 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Acceptance criteria
              </div>
              {s.acceptance.map((ac, i) => (
                <p key={i} className="font-mono text-[10px] leading-relaxed text-slate-700">
                  <span className="font-bold text-slate-500">Given</span> {ac.given}
                  <br />
                  <span className="font-bold text-slate-500">When</span> {ac.when}
                  <br />
                  <span className="font-bold text-slate-500">Then</span> {ac.then}
                </p>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                {s.moduleName}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                {s.featureName}
              </span>
            </div>

            {/* Traceability */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate text-[10px] text-slate-500">
                  {s.linkedArtifactIds
                    .map((id) => state.artifacts.find((a) => a.id === id)?.label ?? id)
                    .join(' · ')}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {s.stale && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    Source changed — review this story
                  </span>
                )}
                {s.stale && !readOnly && (
                  <button
                    onClick={() => reviewStaleStory(state.projectId, s.id)}
                    className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Mark reviewed
                  </button>
                )}
                <button
                  onClick={() => onViewSource('architecture', s.linkedArtifactIds[0])}
                  className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  View source architecture <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
        </div>
      </div>

      {/* Jira export */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">Jira export</h3>
          {state.jiraSyncedMinutesAgo !== undefined && (
            <span className="text-[10px] text-slate-400">
              Jira status synced {relativeTime(state.jiraSyncedMinutesAgo)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {[
            { label: 'Bulk export', value: bulk, set: setBulk },
            { label: 'Assign to sprint', value: assignSprint, set: setAssignSprint },
            { label: 'Map to epics', value: mapEpics, set: setMapEpics },
          ].map((opt) => (
            <label key={opt.label} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={opt.value}
                onChange={(e) => opt.set(e.target.checked)}
                disabled={readOnly}
                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-[11px] font-semibold text-slate-600">{opt.label}</span>
            </label>
          ))}
        </div>

        <p className="text-[10px] text-slate-500">
          Bidirectional — stories push to Jira, status pulls back.
        </p>

        {jiraReady ? (
          <button
            onClick={() => exportStoriesToJira(state.projectId)}
            disabled={readOnly || pending === 0}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Upload className="h-3.5 w-3.5" />
            {pending === 0 ? 'All stories exported' : `Export to Jira (${pending})`}
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span className="text-[11px] font-bold text-amber-900">
              Activate Jira to export → ask your admin.
            </span>
          </div>
        )}
      </section>
    </div>
  );
};
