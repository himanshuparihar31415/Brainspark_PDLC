import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardCard, SpecAiState } from '../../types/specai';
import { CARD_TYPES, COPILOT_SUGGESTIONS } from '../../data/specai';
import { ArrowUp, Bot } from 'lucide-react';

interface Turn {
  id: number;
  from: 'ai' | 'you';
  text: string;
}

/**
 * What the copilot opens with. Derived from the board rather than fixed, so the
 * first thing it says is already true of this workspace.
 */
const opener = (state: SpecAiState): string => {
  if (state.cards.length === 0)
    return 'The board is empty. Drag a knowledge source across and I will read it with you.';

  const conflicts = state.cards.filter((c) => c.type === 'Conflict' && c.state === 'Flagged').length;
  const questions = state.cards.filter(
    (c) => c.type === 'Question' && c.state !== 'Confirmed' && c.state !== 'Superseded'
  ).length;

  if (conflicts === 0 && questions === 0)
    return 'Nothing on this board contradicts itself and no decisions are outstanding. Select cards to ask a grounded question.';

  const found = [
    conflicts > 0 && `${conflicts} likely conflict${conflicts === 1 ? '' : 's'}`,
    questions > 0 && `${questions} missing decision${questions === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' and ');

  return `I found ${found} on this board. Select cards to ask a grounded question.`;
};

/**
 * The copilot answers only from the selection. That is the grounding rule, and
 * the reason the reply names the cards it read: an answer you cannot trace back
 * to a source is not an answer this module is willing to give.
 */
const groundedReply = (selected: BoardCard[]): string => {
  if (selected.length === 0)
    return 'Nothing is selected. Point me at the cards you want me to reason over — I answer only from what you select, so every answer keeps its source.';

  const types = [...new Set(selected.map((c) => CARD_TYPES[c.type].label))].join(', ');
  const conflicts = selected.filter((c) => c.type === 'Conflict');
  const questions = selected.filter((c) => c.type === 'Question');
  const assumptions = selected.filter((c) => c.evidenceClass === 'AI assumption');

  const lines = [
    `Reading ${selected.length} card${selected.length === 1 ? '' : 's'} — ${types}.`,
  ];

  if (conflicts.length > 0) {
    const c = conflicts[0];
    lines.push(
      `The unresolved decision is “${c.title}”: ${c.conflict?.claimASource ?? 'one source'} and ${
        c.conflict?.claimBSource ?? 'another'
      } disagree. I will not draft over it until it is settled.`
    );
  } else if (questions.length > 0) {
    lines.push(
      `“${questions[0].title}” is still open, owned by ${questions[0].owner ?? 'nobody yet'}.`
    );
  } else {
    lines.push('Nothing here contradicts anything else, so this is safe to promote.');
  }

  if (assumptions.length > 0)
    lines.push(
      `${assumptions.length} of these are my assumptions rather than sourced facts — confirm them before they carry weight.`
    );

  lines.push('I can create a formal requirement or raise a stakeholder question from this.');
  return lines.join(' ');
};

/** What the copilot reports back after running a board action. */
const actionReport = (actionId: string, selected: BoardCard[]): string => {
  const n = selected.length;
  switch (actionId) {
    case 'gaps':
      return `Checked ${n} card${n === 1 ? '' : 's'} for gaps. Anything I could not source is now on the board as an open question, tagged as my assumption rather than a fact.`;
    case 'summarize':
      return `Summarized ${n} card${n === 1 ? '' : 's'} and kept the source line on each claim, so you can trace any sentence back.`;
    case 'draft':
      return 'Drafted a requirement seed from the selection. The originals stay on the board — promotion never destroys evidence.';
    case 'conflicts':
      return `Compared the sources behind ${n} card${n === 1 ? '' : 's'}. Any disagreement is now a conflict card you can resolve.`;
    default:
      return 'Done.';
  }
};

/**
 * The copilot rail. Conversational surface over the same board actions the
 * selection bar exposes — asking "what is missing?" runs exactly what Find gaps
 * runs, so the two surfaces can never tell you different things.
 */
export const CopilotPanel: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange }) => {
  const { runBoardAction } = useApp();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState('');
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);

  const selected = state.cards.filter((c) => selectedIds.includes(c.id));
  const seed = useMemo(() => opener(state), [state]);

  const push = (from: Turn['from'], text: string) => {
    setTurns((prev) => [...prev, { id: nextId.current++, from, text }]);
    // Let the new turn land before scrolling to it.
    requestAnimationFrame(() => {
      if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    });
  };

  const ask = (text: string) => {
    push('you', text);
    push('ai', groundedReply(selected));
  };

  const runSuggestion = (actionId: string, asks: string) => {
    push('you', asks);

    if (selectedIds.length === 0) {
      push('ai', groundedReply([]));
      return;
    }

    const snapshot = selected;
    runBoardAction(state.projectId, actionId, selectedIds);
    push('ai', actionReport(actionId, snapshot));

    // These two rewrite the board, so the old selection no longer refers to it.
    if (actionId === 'draft' || actionId === 'remove') onSelectionChange([]);
  };

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-80 lg:w-56 xl:w-72">
      <div className="shrink-0 border-b border-slate-200 px-3.5 py-3">
        <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-tight text-slate-900">
          <Bot className="h-3.5 w-3.5 text-indigo-600" /> AI copilot
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {selectedIds.length > 0
            ? `Reasoning over ${selectedIds.length} selected card${
                selectedIds.length === 1 ? '' : 's'
              }.`
            : 'Ask across selected board items.'}
        </p>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <p className="rounded-xl rounded-tl-sm bg-indigo-50 px-3 py-2 text-[10.5px] leading-relaxed text-slate-700">
          {seed}
        </p>

        {turns.map((t) =>
          t.from === 'ai' ? (
            <p
              key={t.id}
              className="rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[10.5px] leading-relaxed text-slate-700"
            >
              {t.text}
            </p>
          ) : (
            <p
              key={t.id}
              className="ml-6 rounded-xl rounded-br-sm bg-indigo-600 px-3 py-2 text-[10.5px] leading-relaxed text-white"
            >
              {t.text}
            </p>
          )
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 p-2.5">
        <div className="flex flex-wrap gap-1.5">
          {COPILOT_SUGGESTIONS.map((s) => (
            <button
              key={s.actionId}
              onClick={() => runSuggestion(s.actionId, s.asks)}
              disabled={disabled}
              title={
                selectedIds.length === 0
                  ? 'Select cards first — the copilot only answers from what you point at.'
                  : undefined
              }
              className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-[9.5px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-end gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 focus-within:border-indigo-500">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim()) {
                  ask(prompt.trim());
                  setPrompt('');
                }
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder="Ask about this board…"
            className="min-w-0 flex-1 resize-none bg-transparent py-1 text-[10.5px] outline-none disabled:cursor-not-allowed"
          />
          <button
            onClick={() => {
              if (!prompt.trim()) return;
              ask(prompt.trim());
              setPrompt('');
            }}
            disabled={disabled || !prompt.trim()}
            title="Ask"
            className="mb-0.5 shrink-0 cursor-pointer rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
