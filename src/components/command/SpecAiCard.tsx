import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import { canEditSpecAi } from '../../data/specai';
import {
  V2_PHASE_LABEL,
  V2PhaseKey,
  sessionAge,
  v2NextAction,
  v2Phase,
  v2Progress,
  v2Signals,
} from '../../data/specV2';
import {
  ArrowRight,
  Check,
  Lock,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

/**
 * The Spec AI door in the Command Centre, and the one place a specification
 * starts.
 *
 * A project does not have one thing worth specifying, it has several — the login
 * problem, the card problem, the statements problem — and they are worked on at
 * different times and get to different places. So the card lists them: a row per
 * session, each reporting where that specification actually is, and a button that
 * picks it back up. Starting a new one no longer means losing the one you were in.
 *
 * What each row reports is the v2 model, because v2 is what the button opens, and
 * the derivations are shared with the workspace (see data/specV2) so a row cannot
 * claim a gate the rail has already opened.
 */

const PHASE_STYLE: Record<V2PhaseKey, string> = {
  brief: 'border-sky-200 bg-sky-50 text-sky-700',
  prd: 'border-violet-200 bg-violet-50 text-violet-700',
  delivery: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

interface RowModel {
  state: SpecAiState;
  phase: V2PhaseKey;
  progress: number;
  next: string | null;
  unconfirmed: number;
  claims: number;
  stories: number;
  isActive: boolean;
}

export const SpecAiCard: React.FC<{ projectId: string; projectName: string }> = ({
  projectId,
  projectName,
}) => {
  const {
    specSessionsFor,
    activeSessionId,
    startSpecSession,
    resumeSpecSession,
    deleteSpecSession,
    navigateTo,
    currentRole,
  } = useApp();

  const canEdit = canEditSpecAi(currentRole);

  const sessions = specSessionsFor(projectId);
  const activeId = activeSessionId(projectId);

  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  /* Deleting a specification is a two-press action, inline, rather than a modal. */
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* The redesigned conversational surface. */
  const open = () => navigateTo('Spec AI v2');

  /*
   * A row is a specification someone started. An empty session — the lazily
   * created row a project gets the first time anything touches it — is not one
   * yet, and listing it would put a blank line above the very composer that
   * fills it in.
   */
  const rows: RowModel[] = sessions
    .filter((s) => s.problemStatement.trim().length > 0)
    .map((state) => {
      const signals = v2Signals(state);
      return {
        state,
        phase: v2Phase(state),
        progress: v2Progress(state),
        next: v2NextAction(signals),
        unconfirmed: signals.unconfirmed,
        claims: signals.claims,
        stories: signals.stories,
        isActive: state.sessionId === activeId,
      };
    });

  const resume = (sessionId: string) => {
    resumeSpecSession(projectId, sessionId);
    open();
  };

  const start = () => {
    const statement = draft.trim();
    if (!statement) return;
    startSpecSession(projectId, statement);
    setDraft('');
    setComposing(false);
    /* Straight into the thread — the agent starts reading on the way. */
    open();
  };

  const openCount = rows.filter((r) => r.next !== null).length;
  /* With nothing started, the composer is the card rather than something behind a
     button — there is no list for it to sit under yet. */
  const composerOpen = composing || rows.length === 0;

  const composer = (
    <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-800">
          Start a new specification
        </p>
        {rows.length > 0 && (
          <button
            onClick={() => {
              setComposing(false);
              setDraft('');
            }}
            className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-slate-600">
        Start with the problem, in your own words. One or two lines is enough — the
        agent reads what you bring in and asks for the rest. This opens its own session;
        anything already in progress stays where it is.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            /* Enter sends; newlines need a modifier, as in the thread. */
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              start();
            }
          }}
          rows={2}
          autoFocus={composing}
          placeholder="e.g. Checkout abandonment is up 18% since the loyalty programme launched…"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 outline-none focus:border-indigo-600"
        />
        <button
          onClick={start}
          disabled={draft.trim() === ''}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          Start
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  return (
    <section
      className="platform-card overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(219,234,254,0.55) 0%, rgba(255,237,213,0.45) 100%)',
      }}
      aria-label="Spec AI"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/60 bg-white shadow-md shadow-slate-200/50">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Spec AI</h2>
              <p className="text-[10px] font-medium text-slate-600">
                {rows.length === 0
                  ? 'Requirements Intelligence Studio'
                  : `${rows.length} session${rows.length === 1 ? '' : 's'} on ${projectName}${
                      openCount > 0 ? ` · ${openCount} needing you` : ''
                    }`}
              </p>
            </div>
          </div>

          {canEdit && rows.length > 0 && !composerOpen && (
            <button
              onClick={() => setComposing(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              <Plus className="h-3.5 w-3.5" />
              New session
            </button>
          )}
        </div>

        {/* The list. One row per specification on this project. */}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/80">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 font-semibold">Session</th>
                  <th className="px-3 py-2 font-semibold">Phase</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Progress</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Next up</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.state.sessionId}
                    onClick={() => resume(row.state.sessionId)}
                    className={`cursor-pointer border-b border-slate-100 last:border-0 transition-colors hover:bg-indigo-50/60 ${
                      row.isActive ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    {/* Name, and the statement it is read against. */}
                    <td className="max-w-[260px] px-3 py-2.5 align-top">
                      <div className="flex items-center gap-1.5">
                        {row.isActive && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"
                            title="The session this project is currently in"
                          />
                        )}
                        <span className="truncate text-xs font-bold text-slate-900">
                          {row.state.title}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-slate-500">
                        {row.state.problemStatement || 'No statement recorded.'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                        <span>
                          {row.claims} claim{row.claims === 1 ? '' : 's'}
                        </span>
                        {row.unconfirmed > 0 && (
                          <span
                            className="rounded border border-violet-200 bg-violet-50 px-1 py-px text-violet-700"
                            title="Claims classed as an inference or an assumption — nothing has confirmed them."
                          >
                            {row.unconfirmed} unconfirmed
                          </span>
                        )}
                        {row.stories > 0 && <span>{row.stories} stories</span>}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
                          PHASE_STYLE[row.phase]
                        }`}
                      >
                        {V2_PHASE_LABEL[row.phase]}
                      </span>
                    </td>

                    <td className="hidden px-3 py-2.5 align-top sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {row.progress}%
                        </span>
                      </div>
                    </td>

                    <td className="hidden max-w-[180px] px-3 py-2.5 align-top md:table-cell">
                      {row.next ? (
                        <span className="text-[10px] font-semibold text-amber-800">{row.next}</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700">
                          Nothing outstanding
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 align-top text-[10px] font-medium text-slate-500">
                      {sessionAge(row.state.updatedAt)}
                    </td>

                    <td className="px-3 py-2.5 align-top">
                      <div
                        className="flex items-center justify-end gap-1"
                        /* The row itself resumes; the controls inside it must not. */
                        onClick={(e) => e.stopPropagation()}
                      >
                        {confirmDelete === row.state.sessionId ? (
                          <>
                            <button
                              onClick={() => {
                                deleteSpecSession(projectId, row.state.sessionId);
                                setConfirmDelete(null);
                              }}
                              className="flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-rose-700"
                            >
                              <Check className="h-3 w-3" />
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Keep session"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => resume(row.state.sessionId)}
                              className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold shadow-sm ${
                                row.isActive
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {row.isActive ? 'Open' : 'Resume'}
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => setConfirmDelete(row.state.sessionId)}
                                title="Delete this session"
                                className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Delete ${row.state.title}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEdit ? (
          composerOpen && composer
        ) : rows.length === 0 ? (
          /* Read-only personas can follow a spec but not open one. */
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-[11px] leading-relaxed text-slate-600">
              No specification started yet. The Product Manager or Architect opens one — you
              can read along once it exists.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
};
