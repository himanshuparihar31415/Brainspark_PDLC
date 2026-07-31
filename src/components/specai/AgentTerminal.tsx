import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AgentToolCall, AgentTurn, SpecAiState, SpecSource } from '../../types/specai';
import { indexedSources, openQuestionsIn } from '../../data/specai';
import { SourceAttach } from './SourceAttach';
import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleSlash,
  Loader2,
  Sparkles,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

/**
 * The conversation with the agent.
 *
 * It reads as a chat because that is what it is — you ask, it answers. What makes
 * it different from a chatbot is one line under each answer: the tools it ran to
 * get there. Collapsed, because on a normal turn you want the answer; one click
 * away, because the moment you doubt the answer the only thing that helps is
 * seeing which source was opened and what came back.
 *
 * The empty results are why that matters. A source read with nothing to say is a
 * different fact from a source never opened, and only the tool line tells you
 * which you are looking at.
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

/** One expanded tool row. */
const ToolRow: React.FC<{ call: AgentToolCall }> = ({ call }) => {
  const s = STATUS[call.status];
  const Icon = s.icon;

  return (
    <div className="flex gap-1.5 py-1">
      <Icon className={`mt-px h-2.5 w-2.5 shrink-0 ${s.tint} ${s.spin ? 'animate-spin' : ''}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-[9.5px]">
          <span className="font-bold text-slate-700">{call.name}</span>
          <span className="text-slate-400">{call.argument}</span>
          {call.status !== 'running' && (
            <span className="text-slate-300">{call.durationMs}ms</span>
          )}
        </p>
        {call.status !== 'running' && (
          <p className="text-[9.5px] leading-relaxed text-slate-500">{call.result}</p>
        )}
        {call.excerpt && (
          <p className="mt-0.5 border-l-2 border-slate-200 pl-1.5 font-mono text-[9px] leading-relaxed text-slate-400">
            {call.excerpt}
          </p>
        )}
      </div>
    </div>
  );
};

/** The one-line summary of a turn's tool work, expandable. */
const ToolTrace: React.FC<{ calls: AgentToolCall[] }> = ({ calls }) => {
  const [open, setOpen] = useState(false);

  const read = calls.filter((c) => c.name === 'read_source');
  const quiet = calls.filter((c) => c.status === 'empty').length;
  const failed = calls.filter((c) => c.status === 'error').length;
  const ms = calls.reduce((n, c) => n + c.durationMs, 0);

  const summary = [
    `${calls.length} step${calls.length === 1 ? '' : 's'}`,
    read.length > 0 && `${read.length} source${read.length === 1 ? '' : 's'} read`,
    quiet > 0 && `${quiet} with nothing to say`,
    failed > 0 && `${failed} unreadable`,
    `${(ms / 1000).toFixed(1)}s`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1 text-[9.5px] font-semibold text-slate-400 transition-colors hover:text-slate-700"
      >
        <Wrench className="h-2.5 w-2.5" />
        {summary}
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-0.5">
          {calls.map((c) => (
            <ToolRow key={c.id} call={c} />
          ))}
        </div>
      )}
    </div>
  );
};

const TurnView: React.FC<{ turn: AgentTurn }> = ({ turn }) => {
  if (turn.from === 'you')
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-[11.5px] leading-relaxed text-white">
          {turn.text}
        </p>
      </div>
    );

  const calls = turn.toolCalls ?? [];
  /* While it works, the live call is the message — it is more informative than a
     row of dots, and it is the same line you can re-open afterwards. */
  const active = calls.filter((c) => c.status === 'running').slice(-1)[0] ?? calls.slice(-1)[0];

  return (
    <div className="flex gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
        <Sparkles className="h-2.5 w-2.5 text-white" />
      </span>

      <div className="min-w-0 flex-1">
        {turn.pending ? (
          <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <Loader2 className="h-2.5 w-2.5 animate-spin text-indigo-500" />
              {active ? (
                <>
                  <span className="font-mono text-[10px] text-slate-700">{active.name}</span>
                  <span className="min-w-0 truncate font-mono text-[10px] text-slate-400">
                    {active.argument}
                  </span>
                </>
              ) : (
                'Deciding what to read…'
              )}
            </p>
            {calls.length > 1 && (
              <p className="mt-0.5 text-[9.5px] text-slate-400">{calls.length} steps so far</p>
            )}
          </div>
        ) : (
          <>
            <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-[11.5px] leading-relaxed text-slate-700">
              {turn.text}
            </p>

            <div className="flex flex-wrap items-center gap-x-2.5">
              {calls.length > 0 && <ToolTrace calls={calls} />}
              {turn.briefEffect && (
                <span className="mt-1 text-[9.5px] font-bold text-emerald-700">
                  + {turn.briefEffect.added} to the brief · v{turn.briefEffect.version}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * What is worth asking next, derived from the state rather than a fixed menu — a
 * suggestion that ignores what is actually outstanding is just decoration.
 *
 * The open architecture question is deliberately first. Asking it demonstrates
 * the behaviour that matters most here: the agent has no source for it, and says
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
  /** Opens a source's detail, from the attach menu on the composer. */
  onOpenSource: (source: SpecSource) => void;
}> = ({ state, disabled, onOpenSource }) => {
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

  /* Pin to the bottom as the conversation grows, so the newest turn stays in view. */
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || disabled || busy) return;
    askAgent(state.projectId, message);
    setDraft('');
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
        {/*
          The agent opens the conversation rather than leaving you a blank box —
          but only while there is nothing else to read. Once it has answered, its
          first real turn is the opening, and a greeting above it just says the
          same thing twice.
        */}
        {turns.length === 0 && (
          <div className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </span>
            <p className="max-w-[92%] rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-[11.5px] leading-relaxed text-slate-700">
              {readable === 0
                ? 'Add a source above and I will read it. I only answer from what I can actually open, so until something is indexed I have nothing to go on.'
                : !state.problemStatement.trim()
                ? `I can read ${readable} source${
                    readable === 1 ? '' : 's'
                  }, but there is no problem statement yet — without one I have nothing to judge relevance against. Write it above and I will start.`
                : `Reading your ${readable} source${
                    readable === 1 ? '' : 's'
                  } against the problem statement now. You will see every one I open, including the ones that turn out to have nothing to say.`}
            </p>
          </div>
        )}

        {turns.map((t) => (
          <TurnView key={t.id} turn={t} />
        ))}
      </div>

      <footer className="shrink-0 border-t border-slate-200 px-2.5 pb-2.5 pt-2">
        {!disabled && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {prompts(state).map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={busy}
                title={p}
                className="max-w-full cursor-pointer truncate rounded-full border border-slate-200 px-2.5 py-1 text-[9.5px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 rounded-2xl border border-slate-200 bg-slate-50/60 pl-1.5 pr-3 py-2 transition-colors focus-within:border-indigo-500 focus-within:bg-white">
          <SourceAttach state={state} disabled={disabled} onOpenSource={onOpenSource} />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            disabled={disabled || busy}
            placeholder={
              disabled ? 'This stage is locked.' : 'Ask a question, or state a decision…'
            }
            className="min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[11.5px] leading-relaxed outline-none disabled:cursor-not-allowed"
          />
          <button
            onClick={() => send(draft)}
            disabled={disabled || busy || !draft.trim()}
            title="Send"
            className="shrink-0 cursor-pointer rounded-full bg-indigo-600 p-1.5 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
          </button>
        </div>

      </footer>
    </section>
  );
};
