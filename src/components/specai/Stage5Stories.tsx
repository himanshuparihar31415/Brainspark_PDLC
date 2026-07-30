import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SpecAiState,
  SpecStageKey,
  StoryDeliveryStatus,
  StoryType,
  UserStory,
} from '../../types/specai';
import {
  STORY_TRACKS,
  STORY_TRACK_COPY,
  STORY_TRACK_OF,
  StoryTrack,
  storyTrackCounts,
  unmappedStoryTypes,
} from '../../data/specai';
import { STORY_DELIVERY_STATUSES } from '../../data/completion';
import { relativeTime } from '../../data/modules';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Link2,
  RefreshCw,
  Upload,
  Settings2,
} from 'lucide-react';

const STORY_TYPES: StoryType[] = [
  'User story',
  'Technical story',
  'API story',
  'Security story',
  'Data story',
  'Testing story',
  'Migration story',
];

const TYPE_CHIP: Record<StoryType, string> = {
  'User story': 'bg-indigo-50 text-indigo-700',
  'Technical story': 'bg-blue-50 text-blue-700',
  'API story': 'bg-cyan-50 text-cyan-700',
  'Security story': 'bg-rose-50 text-rose-700',
  'Data story': 'bg-violet-50 text-violet-700',
  'Testing story': 'bg-emerald-50 text-emerald-700',
  'Migration story': 'bg-amber-50 text-amber-800',
};

const PRIORITY_CHIP: Record<string, string> = {
  P0: 'border-rose-200 bg-rose-50 text-rose-700',
  P1: 'border-amber-200 bg-amber-50 text-amber-800',
  P2: 'border-slate-200 bg-slate-100 text-slate-600',
};

const DELIVERY_CHIP: Record<StoryDeliveryStatus, string> = {
  Draft: 'bg-slate-100 text-slate-600',
  Exported: 'bg-indigo-50 text-indigo-700',
  'In progress': 'bg-blue-50 text-blue-700',
  Done: 'bg-emerald-50 text-emerald-700',
  Blocked: 'bg-rose-50 text-rose-700',
};

const JIRA_ISSUE_TYPES = ['Story', 'Task', 'Bug', 'Test', 'Sub-task'];

/**
 * Stage 5 — Stories and Jira export.
 *
 * The backlog is presented in two tracks: work a stakeholder can accept on its
 * own, and work that exists because of how the system is built. Both export to
 * the same backlog — the split is for reading and reviewing, not for permissions.
 */
export const Stage5Stories: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  onViewSource: (stage: SpecStageKey) => void;
  /** Controlled by the shell, so the pipeline rail's sub-entries can drive it. */
  track: StoryTrack | 'All';
  onTrackChange: (track: StoryTrack | 'All') => void;
}> = ({ state, readOnly, onViewSource, track, onTrackChange }) => {
  const {
    connectors,
    reviewStaleStory,
    exportStoriesToJira,
    setJiraMapping,
    setStoryDeliveryStatus,
  } = useApp();

  const [typeFilter, setTypeFilter] = useState<StoryType | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [deliveryFilter, setDeliveryFilter] = useState<StoryDeliveryStatus | 'All'>('All');
  const [mappingOpen, setMappingOpen] = useState(false);

  const jiraReady = Boolean(connectors.find((c) => c.id === 'conn-jira')?.activatedProject);
  const unmapped = unmappedStoryTypes(state);
  const pending = state.stories.filter((s) => !s.exported).length;
  const stale = state.stories.filter((s) => s.stale).length;

  if (state.stories.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
        No stories yet. Finalize the module map to generate them.
      </p>
    );
  }

  const modules = [...new Set(state.stories.map((s) => s.moduleName))];
  const trackCounts = storyTrackCounts(state);
  const visible = state.stories.filter(
    (s) =>
      (track === 'All' || STORY_TRACK_OF[s.storyType] === track) &&
      (typeFilter === 'All' || s.storyType === typeFilter) &&
      (priorityFilter === 'All' || s.priority === priorityFilter) &&
      (moduleFilter === 'All' || s.moduleName === moduleFilter) &&
      (deliveryFilter === 'All' || s.deliveryStatus === deliveryFilter)
  );

  /** One section per track, so a flat filter and the split view render the same way. */
  const groups: { track: StoryTrack; stories: UserStory[] }[] = (
    track === 'All' ? STORY_TRACKS : [track]
  ).map((t) => ({ track: t, stories: visible.filter((s) => STORY_TRACK_OF[s.storyType] === t) }));

  const countOf = (fn: (s: (typeof state.stories)[number]) => boolean) =>
    state.stories.filter(fn).length;

  const Chip: React.FC<{ label: string; count?: number; active: boolean; onClick: () => void }> = ({
    label,
    count,
    active,
    onClick,
  }) => (
    <button
      onClick={onClick}
      className={`mb-1 mr-1 inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors ${
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
    <div className="space-y-3">
      {stale > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span className="text-[11px] font-bold text-amber-900">
            Source decision changed. {stale} {stale === 1 ? 'story needs' : 'stories need'} review.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Filters */}
        <aside className="h-fit space-y-3 xl:sticky xl:top-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Track
            </div>
            <div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-200">
              {(['All', ...STORY_TRACKS] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTrackChange(t)}
                  title={t === 'All' ? 'Both tracks' : STORY_TRACK_COPY[t].helper}
                  className={`flex-1 cursor-pointer border-r border-slate-200 px-1.5 py-1.5 text-[9.5px] font-bold leading-tight transition-colors last:border-r-0 ${
                    track === t
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'All' ? 'All' : t === 'Non-technical' ? 'Non-tech' : 'Technical'}
                  <span className={`ml-1 ${track === t ? 'text-slate-300' : 'text-slate-400'}`}>
                    {t === 'All' ? state.stories.length : trackCounts[t]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Story type
            </div>
            <div className="mt-1.5">
              <Chip
                label="All"
                count={state.stories.length}
                active={typeFilter === 'All'}
                onClick={() => setTypeFilter('All')}
              />
              {STORY_TYPES.filter((t) => countOf((s) => s.storyType === t) > 0).map((t) => (
                <Chip
                  key={t}
                  label={t.replace(' story', '')}
                  count={countOf((s) => s.storyType === t)}
                  active={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                />
              ))}
            </div>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Priority
            </div>
            <div className="mt-1.5">
              <Chip label="All" active={priorityFilter === 'All'} onClick={() => setPriorityFilter('All')} />
              {(['P0', 'P1', 'P2'] as const).map((p) => (
                <Chip
                  key={p}
                  label={p}
                  count={countOf((s) => s.priority === p)}
                  active={priorityFilter === p}
                  onClick={() => setPriorityFilter(p)}
                />
              ))}
            </div>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Module
            </div>
            <div className="mt-1.5">
              <Chip label="All" active={moduleFilter === 'All'} onClick={() => setModuleFilter('All')} />
              {modules.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  count={countOf((s) => s.moduleName === m)}
                  active={moduleFilter === m}
                  onClick={() => setModuleFilter(m)}
                />
              ))}
            </div>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Delivery
            </div>
            <div className="mt-1.5">
              <Chip
                label="All"
                active={deliveryFilter === 'All'}
                onClick={() => setDeliveryFilter('All')}
              />
              {STORY_DELIVERY_STATUSES.filter(
                (d) => countOf((s) => s.deliveryStatus === d) > 0
              ).map((d) => (
                <Chip
                  key={d}
                  label={d}
                  count={countOf((s) => s.deliveryStatus === d)}
                  active={deliveryFilter === d}
                  onClick={() => setDeliveryFilter(d)}
                />
              ))}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
              Showing <b className="text-slate-800">{visible.length}</b> of {state.stories.length}
            </div>
          </div>

          {/* Jira mapping */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <button
              onClick={() => setMappingOpen(!mappingOpen)}
              className="flex w-full cursor-pointer items-center justify-between gap-2"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-900">
                <Settings2 className="h-3 w-3" /> Jira mapping
              </span>
              {unmapped.length > 0 && (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                  {unmapped.length} unmapped
                </span>
              )}
            </button>

            {mappingOpen && (
              <div className="mt-2.5 space-y-2">
                {(
                  [
                    ['Epic', 'epic'],
                    ['Release', 'release'],
                    ['Sprint', 'sprint'],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="block">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                    <input
                      value={state.jiraMapping[key]}
                      onChange={(e) => setJiraMapping(state.projectId, { [key]: e.target.value })}
                      disabled={readOnly}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-indigo-600 disabled:cursor-not-allowed"
                    />
                  </label>
                ))}

                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Issue types
                </div>
                {STORY_TYPES.filter((t) => countOf((s) => s.storyType === t) > 0).map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">{t}</span>
                    <select
                      value={state.jiraMapping.issueTypes[t] ?? ''}
                      onChange={(e) =>
                        setJiraMapping(state.projectId, { issueTypes: { [t]: e.target.value } })
                      }
                      disabled={readOnly}
                      className={`shrink-0 cursor-pointer rounded border px-1.5 py-0.5 text-[10px] outline-none focus:border-indigo-600 ${
                        state.jiraMapping.issueTypes[t]
                          ? 'border-slate-200'
                          : 'border-rose-300 bg-rose-50'
                      }`}
                    >
                      <option value="">—</option>
                      {JIRA_ISSUE_TYPES.map((it) => (
                        <option key={it} value={it}>
                          {it}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Story list */}
        <div className="min-w-0 space-y-2.5">
          {visible.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500">
              No stories match this filter.
            </p>
          )}

          {groups.map(
            (g) =>
              g.stories.length > 0 && (
                <section key={g.track} className="space-y-2.5">
                  <div className="flex flex-wrap items-baseline gap-2 pt-1">
                    <h3 className="text-[13px] font-extrabold tracking-tight text-slate-900">
                      {g.track}
                    </h3>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        STORY_TRACK_COPY[g.track].chip
                      }`}
                    >
                      {g.stories.length}
                    </span>
                    <span className="min-w-0 flex-1 text-[10px] text-slate-500">
                      {STORY_TRACK_COPY[g.track].helper}
                    </span>
                  </div>

                  {g.stories.map((s) => (
            <article
              key={s.id}
              className={`rounded-2xl border bg-white p-4 ${
                s.stale ? 'border-amber-300' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-400">{s.key}</span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
                        PRIORITY_CHIP[s.priority]
                      }`}
                    >
                      {s.priority}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                        TYPE_CHIP[s.storyType]
                      }`}
                    >
                      {s.storyType}
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                      {s.points} pts
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                        DELIVERY_CHIP[s.deliveryStatus]
                      }`}
                    >
                      {s.deliveryStatus}
                    </span>
                    {s.exported && s.deliveryStatus !== 'Draft' && (
                      <span className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        <Check className="h-2.5 w-2.5" /> In Jira
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1.5 text-sm font-extrabold tracking-tight text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    As a <b className="text-indigo-700">{s.role}</b>, I want{' '}
                    <b className="text-indigo-700">{s.goal}</b>, so that{' '}
                    <b className="text-indigo-700">{s.benefit}</b>
                  </p>
                </div>

                {!readOnly && (
                  <label className="shrink-0 text-[9px] font-bold text-slate-400">
                    Status
                    <select
                      value={s.deliveryStatus}
                      onChange={(e) =>
                        setStoryDeliveryStatus(
                          state.projectId,
                          s.id,
                          e.target.value as StoryDeliveryStatus
                        )
                      }
                      className="mt-0.5 block cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-600"
                    >
                      {STORY_DELIVERY_STATUSES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="mt-2.5 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Acceptance criteria
                </div>
                {s.acceptance.map((ac, i) => (
                  <p key={i} className="font-mono text-[10px] leading-relaxed text-slate-700">
                    <b className="text-slate-500">Given</b> {ac.given}
                    <br />
                    <b className="text-slate-500">When</b> {ac.when}
                    <br />
                    <b className="text-slate-500">Then</b> {ac.then}
                  </p>
                ))}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                  {s.moduleName}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                  {s.featureName}
                </span>
                {s.linkedRequirementIds.map((r) => (
                  <span
                    key={r}
                    className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-violet-700"
                  >
                    {r}
                  </span>
                ))}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate text-[10px] text-slate-500">
                    {s.linkedArtifactIds
                      .map((id) => state.artifacts.find((a) => a.id === id)?.label ?? id)
                      .join(' · ')}{' '}
                    · {s.sourceEvidence}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {s.stale && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Source changed
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
                    onClick={() => onViewSource('artifacts')}
                    className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    View source <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </article>
                  ))}
                </section>
              )
          )}

          {/* Export */}
          <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">Jira export</h3>
              {state.jiraSyncedMinutesAgo !== undefined && (
                <span className="text-[10px] text-slate-400">
                  Jira status synced {relativeTime(state.jiraSyncedMinutesAgo)}
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-500">
              Bidirectional — stories push to Jira, status pulls back without overwriting Spec AI
              content.
            </p>

            {!jiraReady ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Activate Jira to export — ask your admin.
              </div>
            ) : unmapped.length > 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-900">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Jira is connected, but no issue-type mapping exists for {unmapped[0]}.
              </div>
            ) : (
              <button
                onClick={() => exportStoriesToJira(state.projectId)}
                disabled={readOnly || pending === 0}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Upload className="h-3.5 w-3.5" />
                {pending === 0 ? 'All stories exported' : `Export ${pending} to Jira`}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
