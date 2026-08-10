import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Settings2,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SpecAiState, StoryType, UserStory } from '../../types/specai';
import {
  STORY_TRACKS,
  STORY_TRACK_OF,
  StoryTrack,
  storyTrackCounts,
  unmappedStoryTypes,
} from '../../data/specai';
import { STORY_DELIVERY_STATUSES, deliveryTree } from '../../data/completion';

/**
 * Delivery — modules, features and stories as the one tree they always were.
 *
 * The two screens this replaces rendered the same hierarchy twice, which is why
 * the story list needed a module filter: it was re-deriving with chips the tree
 * the other tab already drew. With the tree present, selecting a node *is* the
 * filter, and four of the five filter groups stop earning their space.
 */

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2 } as const;

/** Type is a dot with a tooltip, not seven filter chips over fourteen stories. */
const TYPE_TINT: Record<StoryType, string> = {
  'User story': '#3538cd',
  'Technical story': '#16794f',
  'API story': '#0e7490',
  'Security story': '#b42318',
  'Data story': '#92670b',
  'Testing story': '#6941c6',
  'Migration story': '#667085',
};

const JIRA_ISSUE_TYPES = ['Story', 'Task', 'Bug', 'Test', 'Sub-task'];

export const DeliveryPanel: React.FC<{ state: SpecAiState; readOnly: boolean }> = ({
  state,
  readOnly,
}) => {
  const {
    addSpecModule,
    addSpecFeature,
    removeSpecNode,
    splitSpecModule,
    setStoryDeliveryStatus,
    reviewStaleStory,
    setJiraMapping,
    exportStoriesToJira,
    lockSpecStage,
  } = useApp();

  const [track, setTrack] = useState<StoryTrack | 'All'>('All');
  const [status, setStatus] = useState<string>('All');
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [mapping, setMapping] = useState(false);
  const [newName, setNewName] = useState('');

  const { modules, orphans } = useMemo(
    () => deliveryTree(state.modules, state.stories),
    [state.modules, state.stories]
  );
  const counts = storyTrackCounts(state);
  const unmapped = unmappedStoryTypes(state);

  /* One selection drives the list: a module, a feature, or everything. */
  const visible = useMemo(() => {
    let rows: UserStory[] = state.stories;
    if (sel) {
      const mod = modules.find((m) => m.id === sel);
      if (mod) rows = mod.features.flatMap((f) => f.stories);
      else rows = modules.flatMap((m) => m.features).find((f) => f.id === sel)?.stories ?? [];
    }
    if (sel === 'orphans') rows = orphans;
    if (track !== 'All') rows = rows.filter((s) => STORY_TRACK_OF[s.storyType] === track);
    if (status !== 'All') rows = rows.filter((s) => s.deliveryStatus === status);
    /* Priority sorts rather than filters — you want P0 first, not P1 hidden. */
    return [...rows].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.key.localeCompare(b.key)
    );
  }, [state.stories, modules, orphans, sel, track, status]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selName =
    sel === 'orphans'
      ? 'Detached'
      : modules.find((m) => m.id === sel)?.name ??
        modules.flatMap((m) => m.features).find((f) => f.id === sel)?.name ??
        'Everything';

  if (state.modules.length === 0) {
    return (
      <div className="dlv">
        <div className="wempty">
          <p>No module map yet.</p>
          <p className="sub">Generated from the approved artifacts.</p>
          {!readOnly && (
            <button
              className="chip selected"
              style={{ marginTop: 14 }}
              onClick={() => lockSpecStage(state.projectId, 'artifacts')}
            >
              Generate module map
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dlv">
      {/* ── Header: the two filters that survived, and the export ── */}
      <div className="dlv-head">
        <div className="dlv-track">
          {(['All', ...STORY_TRACKS] as const).map((t) => (
            <button key={t} className={track === t ? 'on' : ''} onClick={() => setTrack(t)}>
              {t === 'All' ? 'All' : t === 'Non-technical' ? 'Non-tech' : 'Technical'}
              <i>{t === 'All' ? state.stories.length : counts[t]}</i>
            </button>
          ))}
        </div>

        <select className="dlv-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">Any status</option>
          {STORY_DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span className="dlv-count">
          {visible.length} of {state.stories.length}
        </span>

        <button className="dlv-gear" title="Jira field mapping" onClick={() => setMapping(true)}>
          <Settings2 size={13} />
        </button>
        <button
          className="btn btn-primary"
          disabled={readOnly || state.stories.length === 0}
          onClick={() => exportStoriesToJira(state.projectId)}
        >
          <Upload size={12} /> Export
        </button>
      </div>

      <div className="dlv-body">
        {/* ── Tree: selecting a node is the module filter ── */}
        <aside className="dlv-tree">
          <button className={`dlv-n root ${!sel ? 'on' : ''}`} onClick={() => setSel(null)}>
            Everything
            <i>{state.stories.length}</i>
          </button>

          {modules.map((m) => (
            <div key={m.id}>
              <div className={`dlv-n mod ${sel === m.id ? 'on' : ''}`}>
                <button className="dlv-tw" onClick={() => toggle(m.id)}>
                  {open.has(m.id) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
                <button className="dlv-nl" onClick={() => setSel(m.id)}>
                  {m.name}
                </button>
                <i>{m.total}</i>
                {!readOnly && (
                  <button className="dlv-more" onClick={() => setMenu(menu === m.id ? null : m.id)}>
                    <MoreHorizontal size={11} />
                  </button>
                )}
              </div>

              {menu === m.id && !readOnly && (
                <div className="dlv-menu">
                  <input
                    value={newName}
                    placeholder="New feature…"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newName.trim()) {
                        addSpecFeature(state.projectId, m.id, newName.trim());
                        setNewName('');
                        setMenu(null);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      removeSpecNode(state.projectId, m.id);
                      setMenu(null);
                    }}
                  >
                    Remove module
                  </button>
                </div>
              )}

              {open.has(m.id) &&
                m.features.map((f) => (
                  <div key={f.id}>
                    <div className={`dlv-n feat ${sel === f.id ? 'on' : ''}`}>
                      <button className="dlv-nl" onClick={() => setSel(f.id)}>
                        {f.name}
                      </button>
                      <i>{f.total}</i>
                      {!readOnly && (
                        <button
                          className="dlv-more"
                          onClick={() => setMenu(menu === f.id ? null : f.id)}
                        >
                          <MoreHorizontal size={11} />
                        </button>
                      )}
                    </div>
                    {menu === f.id && !readOnly && (
                      <div className="dlv-menu">
                        <button
                          onClick={() => {
                            splitSpecModule(state.projectId, m.id, f.id);
                            setMenu(null);
                          }}
                        >
                          Split into its own module
                        </button>
                        <button
                          onClick={() => {
                            removeSpecNode(state.projectId, m.id, f.id);
                            setMenu(null);
                          }}
                        >
                          Remove feature
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ))}

          {/* Stories whose feature was renamed out from under them. */}
          {orphans.length > 0 && (
            <button
              className={`dlv-n orphan ${sel === 'orphans' ? 'on' : ''}`}
              onClick={() => setSel('orphans')}
              title="These stories name a module or feature that no longer exists"
            >
              <AlertTriangle size={10} /> Detached
              <i>{orphans.length}</i>
            </button>
          )}

          {!readOnly && (
            <input
              className="dlv-add"
              placeholder="+ module"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === 'Enter' && v) {
                  addSpecModule(state.projectId, v);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          )}
        </aside>

        {/* ── Stories: five fields, the rest on click ── */}
        <div className="dlv-list">
          <div className="dlv-scope">{selName}</div>

          {visible.length === 0 ? (
            <div className="dlv-none">
              {state.stories.length === 0 ? (
                <>
                  No stories yet.
                  {!readOnly && (
                    <button
                      className="chip selected"
                      onClick={() => lockSpecStage(state.projectId, 'modules')}
                    >
                      Generate stories
                    </button>
                  )}
                </>
              ) : (
                'Nothing here matches.'
              )}
            </div>
          ) : (
            visible.map((s) => (
              <div className={`dlv-s ${s.stale ? 'stale' : ''}`} key={s.id}>
                <button
                  className="dlv-sh"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <span className="dlv-dot" style={{ background: TYPE_TINT[s.storyType] }} title={s.storyType} />
                  <span className="dlv-key">{s.key}</span>
                  <span className="dlv-t">{s.title}</span>
                  <span className={`dlv-p ${s.priority}`}>{s.priority}</span>
                  <span className="dlv-pts">{s.points}</span>
                  <span className="dlv-own">{s.owner ?? '—'}</span>
                  <span className={`dlv-st ${s.deliveryStatus.replace(/ /g, '-')}`}>
                    {s.deliveryStatus}
                  </span>
                </button>

                {expanded === s.id && (
                  <div className="dlv-sb">
                    <p className="dlv-story">
                      As <b>{s.role}</b>, I want {s.goal} so that {s.benefit}.
                    </p>

                    {s.acceptance.map((a, i) => (
                      <div className="dlv-ac" key={i}>
                        <span>Given</span> {a.given} <span>When</span> {a.when} <span>Then</span>{' '}
                        {a.then}
                      </div>
                    ))}

                    <div className="dlv-links">
                      {s.linkedRequirementIds.map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                      {s.linkedArtifactIds.map((a) => (
                        <span key={a}>{a}</span>
                      ))}
                      {s.sourceEvidence && <em>{s.sourceEvidence}</em>}
                    </div>

                    {s.stale && (
                      <div className="dlv-stale">
                        <AlertTriangle size={11} />
                        {s.staleReason ?? 'Something upstream changed after this was written.'}
                        {!readOnly && (
                          <button
                            className="chip soft"
                            onClick={() => reviewStaleStory(state.projectId, s.id)}
                          >
                            Reviewed
                          </button>
                        )}
                      </div>
                    )}

                    {!readOnly && (
                      <select
                        className="dlv-set"
                        value={s.deliveryStatus}
                        onChange={(e) =>
                          setStoryDeliveryStatus(
                            state.projectId,
                            s.id,
                            e.target.value as UserStory['deliveryStatus']
                          )
                        }
                      >
                        {STORY_DELIVERY_STATUSES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Setup, not daily work — so it lives behind the gear. */}
      {mapping && (
        <div className="doc-overlay" onClick={() => setMapping(false)}>
          <div className="doc art" onClick={(e) => e.stopPropagation()} style={{ height: 'auto' }}>
            <header className="doc-head">
              <div>
                <span className="doc-eyebrow">Configured once</span>
                <h2>Jira field mapping</h2>
              </div>
              <button className="doc-x" onClick={() => setMapping(false)}>
                ×
              </button>
            </header>

            <div className="doc-body">
              {unmapped.length > 0 && (
                <div className="doc-warn">
                  <AlertTriangle size={13} />
                  <div>
                    <b>{unmapped.length} story {unmapped.length === 1 ? 'type' : 'types'}</b> have no
                    issue type. The export refuses until they do.
                  </div>
                </div>
              )}

              <div className="dlv-map">
                {(['epic', 'release', 'sprint'] as const).map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      value={state.jiraMapping[k]}
                      disabled={readOnly}
                      onChange={(e) => setJiraMapping(state.projectId, { [k]: e.target.value })}
                    />
                  </label>
                ))}
              </div>

              <div className="wsec">Issue types</div>
              {([...new Set(state.stories.map((s) => s.storyType))] as StoryType[]).map((t) => (
                <label className="dlv-map-row" key={t}>
                  <span>{t}</span>
                  <select
                    value={state.jiraMapping.issueTypes[t] ?? ''}
                    disabled={readOnly}
                    onChange={(e) =>
                      setJiraMapping(state.projectId, {
                        issueTypes: { [t]: e.target.value },
                      })
                    }
                  >
                    <option value="">Not mapped</option>
                    {JIRA_ISSUE_TYPES.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <footer className="doc-foot">
              <span className="doc-fmeta">
                {state.jiraSyncedMinutesAgo === 0 ? 'Synced just now' : 'Not synced yet'}
              </span>
              <button className="btn btn-primary" onClick={() => setMapping(false)}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
