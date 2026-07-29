import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChalkLayer, SpecAiState, SourceType } from '../../types/specai';
import { ARCHETYPES } from '../../data/specai';
import {
  Upload,
  Link2,
  BookOpen,
  Trash2,
  AlertTriangle,
  Check,
  MessageSquare,
  Send,
  Sparkles,
  Lock,
} from 'lucide-react';

const LAYER_ORDER: ChalkLayer[] = ['Scope', 'Dependencies', 'Acceptance criteria'];

/** Stage 1 — Knowledge Creation & Contextualization. */
export const Stage1Knowledge: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const {
    connectors,
    addSpecSource,
    removeSpecSource,
    resolveFlaggedQuestion,
    startChalkBoard,
    sendChalkMessage,
    applyArchetype,
    addToast,
  } = useApp();

  const [urlValue, setUrlValue] = useState('');
  const [chalkInput, setChalkInput] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [archetypesOpen, setArchetypesOpen] = useState(false);

  const disabled = readOnly || locked;
  const confluence = connectors.find((c) => c.id === 'conn-confluence');
  const confluenceReady = Boolean(confluence?.activatedProject);

  const openFlags = state.flaggedQuestions.filter((f) => f.status === 'Open');

  const addFile = () => {
    const n = state.sources.length + 1;
    addSpecSource(state.projectId, `Uploaded document ${n}.pdf`, 'PDF');
  };

  const addUrl = () => {
    if (!urlValue.trim()) return;
    addSpecSource(state.projectId, urlValue.trim(), 'URL');
    setUrlValue('');
  };

  return (
    <div className="space-y-5">
      {/* Two equal, combinable knowledge paths */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* ── Left: document intake */}
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Upload source documents</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              PRDs, raw requirements, notes, email threads, legacy docs, competitor analysis.
            </p>
          </div>

          <button
            onClick={addFile}
            disabled={disabled}
            className={`flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
              disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                : 'cursor-pointer border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40'
            }`}
          >
            <Upload className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">
              Drop files here or browse — PDF, DOCX, TXT
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUrl()}
              disabled={disabled}
              placeholder="…or paste a URL"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 focus:bg-white disabled:cursor-not-allowed"
            />
            <button
              onClick={addUrl}
              disabled={disabled || !urlValue.trim()}
              className="shrink-0 cursor-pointer rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <button
            onClick={() =>
              confluenceReady
                ? addSpecSource(state.projectId, 'Confluence — imported space', 'Confluence')
                : addToast('This needs the Confluence connector. Ask your admin.', 'error')
            }
            disabled={disabled}
            title={
              confluenceReady
                ? undefined
                : 'Ask your admin to activate Confluence.'
            }
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              confluenceReady && !disabled
                ? 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Import from Confluence →
          </button>

          <div>
            <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Added so far ({state.sources.length})
            </h4>
            {state.sources.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-[11px] text-slate-400">
                Nothing added yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {state.sources.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
                      {s.name}
                    </span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                      {s.type}
                    </span>
                    <button
                      onClick={() => removeSpecSource(state.projectId, s.id)}
                      disabled={disabled}
                      className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Right: Requirements Chalk Board */}
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
              Requirements Chalk Board
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Talk it through. The bot validates each layer before it’s accepted.
            </p>
          </div>

          {/* Layer ladder, visible alongside the conversation */}
          <div className="flex flex-wrap items-center gap-1.5">
            {LAYER_ORDER.map((layer, idx) => {
              const st = state.chalkBoard.layers[layer];
              return (
                <React.Fragment key={layer}>
                  <span
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${
                      st === 'Locked'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : st === 'Validating'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {st === 'Locked' ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : st === 'Validating' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    ) : (
                      <Lock className="h-2.5 w-2.5" />
                    )}
                    {layer}
                  </span>
                  {idx < LAYER_ORDER.length - 1 && (
                    <span className="text-slate-300">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {!state.chalkBoard.started ? (
            <button
              onClick={() => startChalkBoard(state.projectId)}
              disabled={disabled}
              className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Start a conversation
            </button>
          ) : (
            <>
              <div className="max-h-64 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                {state.chalkBoard.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                      m.from === 'bot'
                        ? 'bg-white text-slate-700 shadow-xs'
                        : 'ml-auto bg-indigo-600 text-white'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={chalkInput}
                  onChange={(e) => setChalkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chalkInput.trim()) {
                      sendChalkMessage(state.projectId, chalkInput.trim());
                      setChalkInput('');
                    }
                  }}
                  disabled={disabled}
                  placeholder="Describe a requirement, or answer the bot’s question…"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 focus:bg-white disabled:cursor-not-allowed"
                />
                <button
                  onClick={() => {
                    if (!chalkInput.trim()) return;
                    sendChalkMessage(state.projectId, chalkInput.trim());
                    setChalkInput('');
                  }}
                  disabled={disabled || !chalkInput.trim()}
                  className="shrink-0 cursor-pointer rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          <p className="text-[10px] leading-snug text-slate-400">
            A requirement only advances once it’s been walked through every layer — not just
            captured.
            {state.chalkBoard.acceptedRequirements > 0 && (
              <span className="ml-1 font-bold text-emerald-600">
                {state.chalkBoard.acceptedRequirements} accepted so far.
              </span>
            )}
          </p>
        </section>
      </div>

      {/* ── Archetype-based start (advanced) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <button
          onClick={() => setArchetypesOpen(!archetypesOpen)}
          className="flex w-full cursor-pointer items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            Start from an archetype (advanced)
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {archetypesOpen ? 'Hide' : 'Show'}
          </span>
        </button>

        {archetypesOpen && (
          <div className="mt-3 space-y-3">
            <div>
              <h4 className="text-[11px] font-bold text-slate-800">Choose a domain archetype</h4>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Generates an initial understanding and module skeleton from a reusable pattern.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ARCHETYPES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => applyArchetype(state.projectId, a.id)}
                  disabled={disabled}
                  className="cursor-pointer rounded-xl border border-slate-200 p-3 text-left transition-all hover:border-indigo-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="text-[11px] font-bold text-slate-900">{a.name}</div>
                  <div className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    {a.description}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400">
              Which archetypes are available is set by your admin.
            </p>
          </div>
        )}
      </section>

      {/* ── Flagged questions — the contextualization gate */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Flagged questions ({state.flaggedQuestions.length})
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Where your sources disagree or leave gaps. Resolve these before locking.
          </p>
        </div>

        {openFlags.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span className="text-[11px] font-bold text-amber-900">
              Unresolved flags block stage lock.
            </span>
          </div>
        )}

        {state.flaggedQuestions.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-5 text-center text-[11px] text-slate-500">
            No conflicts found across your sources.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {state.flaggedQuestions.map((f) => (
              <div key={f.id} className="px-3 py-2.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      f.status === 'Open'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {f.status}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold leading-relaxed text-slate-900">
                      {f.question}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{f.fromSources}</p>
                    {f.resolution && (
                      <p className="mt-1 rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-900">
                        <span className="font-bold">Resolved: </span>
                        {f.resolution}
                      </p>
                    )}
                  </div>

                  {f.status === 'Open' && (
                    <button
                      onClick={() => {
                        setResolvingId(f.id);
                        setResolutionText('');
                      }}
                      disabled={disabled}
                      className="shrink-0 cursor-pointer text-[10px] font-bold text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Resolve →
                    </button>
                  )}
                </div>

                {resolvingId === f.id && (
                  <div className="mt-2 flex items-center gap-2 pl-14">
                    <input
                      autoFocus
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && resolutionText.trim()) {
                          resolveFlaggedQuestion(state.projectId, f.id, resolutionText.trim());
                          setResolvingId(null);
                        }
                      }}
                      placeholder="How is this resolved?"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-indigo-600"
                    />
                    <button
                      onClick={() => {
                        if (!resolutionText.trim()) return;
                        resolveFlaggedQuestion(state.projectId, f.id, resolutionText.trim());
                        setResolvingId(null);
                      }}
                      className="shrink-0 cursor-pointer rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setResolvingId(null)}
                      className="shrink-0 cursor-pointer text-[10px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
