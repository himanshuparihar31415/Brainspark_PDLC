import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AgentToolCall, AgentTurn, SpecAiState } from '../../types/specai';
import { indexedSources, openQuestionsIn } from '../../data/specai';
import {
  ArrowUp,
  Check,
  ChevronRight,
  CircleSlash,
  Loader2,
  Sparkles,
  Terminal,
  TriangleAlert,
} from 'lucide-react';

/**
 * The agent terminal — where the work is visible.
 *
 * A chat that only shows prose asks you to take its word for everything. Here
 * every reply sits under the calls that produced it: which source was opened,
 * what came back, and how long it took. The empty results matter most — a source
 * that was read and had nothing to say is the difference between a thin answer
 * and a missing one, and only the tool line can tell you which you are looking at.
 */

const STATUS: Record<
  AgentToolCall['status'],
  { icon: React.ElementType; tint: string; spin?: boolean }
> = {
  running: { icon: Loader2, tint: 'text-indigo-500', spin: true },
  ok: { icon: Check, tint: 'text-emerald-600' },
  empty: { icon: CircleSlash, tint: 'text-slate-400' },
  error: { icon: TriangleAlert, tint: 'text-rose-500' },
};

/** One tool line. Collapsed to a single row until you want the detail. */
const ToolLine: React.FC<{ call: AgentToolCall }> = ({ call }) => {
  const [open, setOpen] = useState(false);
  const s = STATUS[call.status];
  const Icon = s.icon;
  const hasDetail = call.status !== 'running';

  return (
    <div className="rounded-md border border-slate-200/80 bg-slate-50/60">
      <button
        onClick={() => hasDetail && setOpen(!open)}
        disabled={!hasDetail}
        className={`flex w-full items-center gap-1.5 px-2 py-1 text-left ${
          hasDetail ? 'cursor-pointer hover:bg-slate-100/70' : 'cursor-default'
        }`}
      >
        <ChevronRight
          className={`h-2.5 w-2.5 shrink-0 text-slate-300 transition-transform ${
            open ? 'rotate-90' : ''
          } ${hasDetail ? '' : 'invisible'}`}
        />
        <Icon className={`h-2.5 w-2.5 shrink-0 ${s.tint} ${s.spin ? 'animate-spin' : ''}`} />
        <span className="shrink-0 font-mono text-[9.5px] font-bold text-slate-700">{call.name}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-slate-400">
          {call.argument}
        </span>
        {call.status === 'running' ? (
          <span className="shrink-0 font-mono text-[9px] text-slate-300">…</span>
        ) : (
          <span className="shrink-0 font-mono text-[9px] text-slate-300">{call.durationMs}ms</span>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200/80 px-2 py-1.5 pl-7">
          <p className="text-[10px] leading-relaxed text-slate-600">{call.result}</p>
          {call.excerpt && (
            <p className="mt-1 border-l-2 border-slate-200 pl-2 font-mono text-[9.5px] leading-relaxed text-slate-500">
              {call.excerpt}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const TurnView: React.FC<{ turn: AgentTurn }> = ({ turn }) => {
  if (turn.from === 'you')
    return (
      <p className="ml-8 rounded-xl rounded-br-sm bg-indigo-600 px-3 py-2 text-[11px] leading-relaxed text-white">
        {turn.text}
      </p>
    );

  const calls = turn.toolCalls ?? [];

  return (
    <div className="mr-6 space-y-1.5">
      {calls.length > 0 && (
        <div className="space-y-1">
          {calls.map((c) => (
            <ToolLine key={c.id} call={c} />
          ))}
        </div>
      )}

      {turn.pending ? (
        <p className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-slate-400">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {calls.length === 0 ? 'Deciding what to read…' : 'Reading…'}
        </p>
      ) : (
        <>
          <p className="rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-700">
            {turn.text}
          </p>
          {turn.briefEffect && (
            <p className="px-1 text-[9.5px] font-bold text-emerald-700">
              + {turn.briefEffect.added} into the project brief · now v{turn.briefEffect.version}
            </p>
          )}
        </>
      )}
    </div>
  );
};

/**
 * What is worth asking next, derived from the state rather than a fixed menu — a
 * suggestion that ignores what is actually outstanding is just decoration.
 *
 * The open architecture question is deliberately first. Asking it demonstrates
 * the behaviour that matters most here: the agent has no source for it and says
 * so rather than producing something plausible.
 */
const prompts = (state: SpecAiState): string[] => {
  const out: string[] = [];
  const openArch = openQuestionsIn(state, 'Architecture');

  if (openArch.length > 0) out.push(openArch[0].text);
  if (indexedSources(state).length > 1) out.push('Do my sources agree on the priority?');
  out.push('What is missing that you would need to specify this?');

  return out.slice(0, 3);
};

export const AgentTerminal: React.FC<{
  state: SpecAiState;
  disabled: boolean;
}> = ({ state, disabled }) => {
  const { askAgent } = useApp();

  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  /**
   * Which project has already had its opening read fired. Keyed rather than a
   * bare flag, because this component is reused across projects rather than
   * remounted — a flag would leave the second project never reading.
   */
  const opened = useRef<string | null>(null);

  const busy = Boolean(state.generating);
  const readable = indexedSources(state).length;
  const turns = state.transcript;

  /*
   * The first thing that happens is the agent reading, not a blank prompt. You
   * gave it a problem statement and some sources; asking you to also click a
   * button to make it look at them is asking twice for the same thing.
   */
  useEffect(() => {
    if (opened.current === state.projectId || disabled || busy) return;
    if (turns.length > 0) return;
    if (!state.problemStatement.trim() || readable === 0) return;

    opened.current = state.projectId;
    askAgent(state.projectId, '');
  }, [askAgent, busy, disabled, readable, state.problemStatement, state.projectId, turns.length]);

  /* Pin to the bottom as tool calls land, so the newest work stays in view. */
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const send = () => {
    const text = draft.trim();
    if (!text || disabled || busy) return;
    askAgent(state.projectId, text);
    setDraft('');
  };

  const toolCount = turns.reduce((n, t) => n + (t.toolCalls?.length ?? 0), 0);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-slate-200 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-slate-900">
          <Terminal className="h-3 w-3 text-slate-400" />
          Agent terminal
        </span>
        <span className="text-[9.5px] text-slate-400">
          {readable} readable source{readable === 1 ? '' : 's'}
          {toolCount > 0 && ` · ${toolCount} tool call${toolCount === 1 ? '' : 's'}`}
        </span>
        {state.brief && (
          <span className="ml-auto rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
            brief v{state.brief.version}
          </span>
        )}
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {turns.length === 0 && !busy ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Sparkles className="h-5 w-5 text-slate-300" />
            <p className="max-w-sm text-[11px] leading-relaxed text-slate-500">
              {readable === 0
                ? 'Nothing is readable yet. Add a source above — the agent reads what is indexed and shows you every file it opens.'
                : !state.problemStatement.trim()
                ? 'State the problem above. The agent reads your sources against it, and everything it finds becomes the project brief.'
                : 'Ask the agent to read your sources. Every tool call it makes is shown here, so you can see what it opened and what came back.'}
            </p>
            {readable > 0 && !disabled && (
              <button
                onClick={() => askAgent(state.projectId, '')}
                className="cursor-pointer rounded-lg bg-slate-900 px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-slate-800"
              >
                Read my {readable} source{readable === 1 ? '' : 's'}
              </button>
            )}
          </div>
        ) : (
          turns.map((t) => <TurnView key={t.id} turn={t} />)
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-200 p-2.5">
        {!disabled && turns.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {prompts(state).map((p) => (
              <button
                key={p}
                onClick={() => askAgent(state.projectId, p)}
                disabled={busy}
                title={p}
                className="max-w-full cursor-pointer truncate rounded-lg border border-slate-200 px-2 py-1 text-[9.5px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 focus-within:border-indigo-500">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            disabled={disabled || busy}
            placeholder={
              disabled
                ? 'This stage is locked.'
                : 'Ask about your sources, or state a decision to record…'
            }
            className="min-w-0 flex-1 resize-none bg-transparent py-1 text-[11px] outline-none disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={disabled || busy || !draft.trim()}
            title="Send"
            className="mb-0.5 shrink-0 cursor-pointer rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
          </button>
        </div>

        <p className="mt-1.5 px-0.5 text-[9px] leading-relaxed text-slate-400">
          A question no source answers becomes an open question, not an answer. A statement is
          recorded as your decision.
        </p>
      </footer>
    </section>
  );
};
