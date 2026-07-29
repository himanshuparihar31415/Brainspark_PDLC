import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChalkLayer, SpecAiState } from '../../types/specai';
import { Check, Lock, Send, Sparkles } from 'lucide-react';

const LAYER_ORDER: ChalkLayer[] = ['Scope', 'Dependencies', 'Acceptance criteria'];

const SUGGESTIONS = ['What is missing?', 'Find evidence', 'Draft requirement', 'Compare sources'];

/**
 * The copilot is also the Chalk Board's validator: it walks a requirement through
 * Scope → Dependencies → Acceptance criteria, and only accepts it once every
 * layer is locked. Captured is not the same as validated.
 */
export const CopilotPanel: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  /** Board cards the question should be grounded in. */
  selectedCount: number;
}> = ({ state, disabled, selectedCount }) => {
  const { startChalkBoard, sendChalkMessage } = useApp();
  const [input, setInput] = useState('');

  const send = (text: string) => {
    if (!text.trim()) return;
    sendChalkMessage(state.projectId, text.trim());
    setInput('');
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          AI copilot
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {selectedCount > 0
            ? `Grounded in ${selectedCount} selected card${selectedCount === 1 ? '' : 's'}.`
            : 'Select cards to ask a grounded question.'}
        </p>
      </div>

      {/* Layer ladder — the validation the Chalk Board enforces */}
      <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Requirement layers
        </div>
        <div className="space-y-1">
          {LAYER_ORDER.map((layer) => {
            const st = state.chalkBoard.layers[layer];
            return (
              <div key={layer} className="flex items-center gap-1.5">
                {st === 'Locked' ? (
                  <Check className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                ) : st === 'Validating' ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                ) : (
                  <Lock className="h-2.5 w-2.5 shrink-0 text-slate-300" />
                )}
                <span
                  className={`text-[10px] font-semibold ${
                    st === 'Locked'
                      ? 'text-emerald-700'
                      : st === 'Validating'
                      ? 'text-blue-700'
                      : 'text-slate-400'
                  }`}
                >
                  {layer}
                </span>
                <span className="ml-auto text-[9px] text-slate-400">{st}</span>
              </div>
            );
          })}
        </div>
        {state.chalkBoard.acceptedRequirements > 0 && (
          <div className="mt-2 border-t border-slate-200 pt-1.5 text-[9px] font-bold text-emerald-600">
            {state.chalkBoard.acceptedRequirements} requirements accepted
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {!state.chalkBoard.started ? (
          <div className="space-y-2.5">
            <p className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-600">
              I can walk a requirement through scope, dependencies and acceptance criteria before it
              enters the pipeline.
            </p>
            <button
              onClick={() => startChalkBoard(state.projectId)}
              disabled={disabled}
              className="w-full cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          state.chalkBoard.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-[10px] leading-relaxed ${
                m.from === 'bot'
                  ? 'bg-slate-100 text-slate-700'
                  : 'ml-auto bg-indigo-600 text-white'
              }`}
            >
              {m.text}
            </div>
          ))
        )}
      </div>

      {state.chalkBoard.started && (
        <>
          <div className="flex flex-wrap gap-1.5 border-t border-slate-200 px-3 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={disabled}
                className="cursor-pointer rounded-full border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-200 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              disabled={disabled}
              rows={3}
              placeholder="Describe a requirement, or answer the bot’s question…"
              className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] outline-none focus:border-indigo-600 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => send(input)}
              disabled={disabled || !input.trim()}
              className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Send className="h-3 w-3" /> Send
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
