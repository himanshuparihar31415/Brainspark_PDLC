import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import {
  ArrowRight,
  Ban,
  Bug,
  CircleHelp,
  FileText,
  Loader2,
  MessageSquare,
  ScrollText,
  Sparkles,
  Target,
} from 'lucide-react';

/**
 * Where a project starts.
 *
 * The first question is the one that matters. Every stage after this reads its
 * sources, raises its questions and generates its backlog against the direction
 * set here — so a vague start does not stay vague, it becomes a confidently wrong
 * specification four stages later. That is why this gets the whole screen once,
 * instead of a field in a toolbar.
 *
 * It takes whatever you have. A written problem, a log paste, a ticket, notes
 * from the room — the agent says which it thinks it got, shows what it took from
 * it, and proposes a task. If the input will not support a task it asks instead
 * of inventing one.
 */

const EXAMPLES: { kind: string; icon: React.ElementType; hint: string; body: string }[] = [
  {
    kind: 'A problem',
    icon: Target,
    hint: 'What is wrong and who it costs',
    body: 'Returning customers abandon login because a PIN is demanded every single time. We want biometric login for customers who have already onboarded, without weakening device security or breaking the shared OAuth gateway.',
  },
  {
    kind: 'System logs',
    icon: ScrollText,
    hint: 'Paste the failure and let it group them',
    body: `2026-07-29T11:14:02Z ERROR auth-service Token refresh failed for session 8f2ac91b: upstream timeout after 5000ms
2026-07-29T11:14:44Z ERROR auth-service Token refresh failed for session 22d0e7fa: upstream timeout after 5000ms
2026-07-29T11:15:03Z WARN  session-worker Retry budget exhausted, forcing re-authentication
2026-07-29T11:15:03Z ERROR auth-service Token refresh failed for session 4b1c88de: upstream timeout after 5000ms
  at com.finedge.auth.TokenClient.refresh(TokenClient.java:184)`,
  },
  {
    kind: 'An issue',
    icon: Bug,
    hint: 'A ticket, as it was filed',
    body: `FMB2-142: Login abandonment on returning customers

Steps to reproduce:
1. Sign in on a device already registered
2. Enter the correct PIN
3. Observe the OTP prompt appears anyway

Expected: a registered device should not be challenged for an OTP.
Actual: every session is challenged, and 31% of support contacts are about this.`,
  },
];

const KIND_ICON: Record<string, React.ElementType> = {
  'Problem statement': Target,
  'System logs': ScrollText,
  'Issue description': Bug,
  'Meeting notes': MessageSquare,
  Unclear: CircleHelp,
};

export const IntakeGate: React.FC<{ state: SpecAiState; readOnly: boolean }> = ({
  state,
  readOnly,
}) => {
  const { submitIntake, acceptIntake, clearIntake } = useApp();

  const [draft, setDraft] = useState(state.intake?.raw ?? '');
  const [answer, setAnswer] = useState('');
  /**
   * The confirmed problem statement. Held here rather than read off the intake,
   * because this is the one field that must be right before anything runs — you
   * get the agent's draft of it, and the last word on it.
   */
  const [statement, setStatement] = useState(state.intake?.task?.statement ?? '');
  /** Which reading the statement box is showing, so a re-read refills it. */
  const shown = useRef<string | undefined>(state.intake?.task?.statement);

  const busy = Boolean(state.generating);
  const intake = state.intake;

  const proposed = intake?.task?.statement;
  if (proposed && shown.current !== proposed) {
    shown.current = proposed;
    setStatement(proposed);
  }

  /** Answer what it asked for: append and re-read, keeping what you already said. */
  const reply = () => {
    if (!answer.trim() || busy) return;
    const merged = `${draft.trim()}\n\n${answer.trim()}`;
    setDraft(merged);
    setAnswer('');
    submitIntake(state.projectId, merged);
  };

  const KindIcon = intake ? KIND_ICON[intake.kind] ?? FileText : FileText;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-1 py-6">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
              What problem are we solving?
            </h1>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-600">
              Give me whatever you have — a written problem, a log paste, a ticket, notes from the
              room. I will draft a problem statement from it for you to confirm, then gather
              requirements against it. Everything after this depends on getting that statement right,
              which is why it is the one thing I will not proceed without.
            </p>
          </div>
        </div>

        {/* The input */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitIntake(state.projectId, draft);
              }
            }}
            rows={7}
            disabled={readOnly || busy}
            placeholder="Describe the problem, paste logs, drop in a ticket, or paste your notes from the room…"
            className="w-full resize-y bg-transparent px-1 text-[12px] leading-relaxed outline-none disabled:cursor-not-allowed"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <button
              onClick={() => submitIntake(state.projectId, draft)}
              disabled={readOnly || busy || draft.trim() === ''}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {busy ? 'Reading…' : intake ? 'Read it again' : 'Read this'}
            </button>

            <span className="text-[10px] text-slate-400">
              {draft.trim() ? `${draft.trim().split(/\s+/).length} words` : 'Anything is a start'}
            </span>

            {!intake && !draft.trim() && (
              <span className="ml-auto flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Try:</span>
                {EXAMPLES.map((e) => {
                  const Icon = e.icon;
                  return (
                    <button
                      key={e.kind}
                      onClick={() => setDraft(e.body)}
                      title={e.hint}
                      className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[9.5px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {e.kind}
                    </button>
                  );
                })}
              </span>
            )}
          </div>
        </div>

        {/* What the agent made of it */}
        {intake && !busy && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700">
                <KindIcon className="h-3 w-3 text-indigo-600" />
                Read as {intake.kind.toLowerCase()}
              </span>
              <span className="text-[10px] text-slate-400">{intake.kindReason}</span>
            </div>

            {/* The concise brief */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Initial brief
              </h2>
              <div className="mt-2 space-y-2">
                {intake.conciseBrief.split('\n\n').map((para, i) => (
                  <p
                    key={i}
                    className={`leading-relaxed ${
                      i === 0
                        ? 'text-[12.5px] font-semibold text-slate-900'
                        : 'text-[11.5px] text-slate-600'
                    }`}
                  >
                    {para}
                  </p>
                ))}
              </div>

              {intake.signals.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5">
                  {intake.signals.map((s) => (
                    <div key={s.label} className="flex gap-2">
                      <span className="w-32 shrink-0 text-[10px] font-bold text-slate-400">
                        {s.label}
                      </span>
                      <span className="min-w-0 flex-1 font-mono text-[10px] leading-relaxed text-slate-700">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Either the task, or what it needs first */}
            {intake.task ? (
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4">
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                  The task I propose
                </h2>
                <p className="mt-1.5 text-[13px] font-extrabold tracking-tight text-slate-900">
                  {intake.task.title}
                </p>

                {/*
                  The problem statement, as the agent drafted it and as you will
                  confirm it. This is the one required field in the module: every
                  stage after this judges relevance against it, so it gets edited
                  here and now rather than discovered to be wrong four stages on.
                */}
                <div className="mt-2.5 rounded-xl border border-indigo-200 bg-white p-2.5">
                  <label className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                    <Target className="h-3 w-3 text-indigo-600" />
                    Problem statement
                    <span className="font-semibold normal-case tracking-normal text-rose-600">
                      required
                    </span>
                  </label>
                  <textarea
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    rows={3}
                    disabled={readOnly}
                    placeholder="The problem this project exists to solve…"
                    className="mt-1 w-full resize-y bg-transparent text-[11.5px] leading-relaxed outline-none disabled:cursor-not-allowed"
                  />
                  <p className="border-t border-slate-100 pt-1.5 text-[9.5px] leading-relaxed text-slate-400">
                    I drafted this from your input. Correct it — this is what decides which sources
                    count as relevant and what ends up in the backlog.
                  </p>
                </div>

                <ol className="mt-3 space-y-1.5">
                  {intake.task.steps.map((step, i) => (
                    <li key={step} className="flex gap-2">
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[8.5px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                        {i + 1}
                      </span>
                      <span className="text-[11px] leading-relaxed text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>

                <p className="mt-3 flex items-start gap-1.5 border-t border-indigo-100 pt-2.5 text-[10.5px] leading-relaxed text-slate-500">
                  <Ban className="mt-px h-3 w-3 shrink-0 text-slate-400" />
                  <span>
                    <b className="font-bold text-slate-600">Not in scope.</b>{' '}
                    {intake.task.outOfScope}
                  </span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => acceptIntake(state.projectId, statement)}
                    disabled={readOnly || statement.trim() === '' || busy}
                    title={
                      statement.trim() === ''
                        ? 'A problem statement is required before anything can be gathered.'
                        : 'Starts the agent reading your sources against this statement'
                    }
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Gather requirements
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => clearIntake(state.projectId)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Start over
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {statement.trim() === ''
                      ? 'The statement cannot be empty.'
                      : 'The agent starts reading, and the brief fills in as it goes.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4">
                <h2 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                  <CircleHelp className="h-3.5 w-3.5" />
                  I need this before I start
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {intake.needs.map((n) => (
                    <li key={n} className="text-[11.5px] leading-relaxed text-amber-900">
                      · {n}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-amber-200 pt-2.5 text-[10.5px] leading-relaxed text-amber-800">
                  I could produce a task from what you gave me, but I would be choosing the direction
                  myself and you would not be able to tell.
                </p>

                {/* Answering here appends to what you pasted and re-reads it, so the
                    input keeps everything you have said rather than replacing it. */}
                {!readOnly && (
                  <div className="mt-2 flex items-end gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 focus-within:border-amber-500">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          reply();
                        }
                      }}
                      rows={2}
                      placeholder="Answer here and I will read it again…"
                      className="min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[11.5px] leading-relaxed outline-none"
                    />
                    <button
                      onClick={reply}
                      disabled={busy || answer.trim() === ''}
                      title="Add this and read again"
                      className="mb-0.5 shrink-0 cursor-pointer rounded-full bg-amber-500 p-1.5 text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
