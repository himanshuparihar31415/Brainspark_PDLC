import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeChannel, SpecAiState } from '../../types/specai';
import { ARCHETYPES } from '../../data/specai';
import { ChalkBoardCanvas } from './ChalkBoardCanvas';
import { CopilotPanel } from './CopilotPanel';
import { SourceDrawer } from './SourceDrawer';
import {
  Upload,
  Link2,
  BookOpen,
  Trash2,
  AlertTriangle,
  Sparkles,
  Search,
  FileText,
  Plus,
} from 'lucide-react';

const CHANNEL_DOT: Record<KnowledgeChannel['status'], string> = {
  Ready: 'bg-emerald-500',
  Indexing: 'bg-amber-500',
  'Not connected': 'bg-slate-300',
};

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
    applyArchetype,
    addToast,
  } = useApp();

  const [urlValue, setUrlValue] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [archetypesOpen, setArchetypesOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [drawerChannel, setDrawerChannel] = useState<KnowledgeChannel | null>(null);

  const disabled = readOnly || locked;
  const confluence = connectors.find((c) => c.id === 'conn-confluence');
  const confluenceReady = Boolean(confluence?.activatedProject);

  const openFlags = state.flaggedQuestions.filter((f) => f.status === 'Open');
  const indexed = state.channels.reduce((sum, c) => sum + c.itemsIndexed, 0);
  const conflicts = state.boardNotes.filter((n) => n.kind === 'Conflict').length;
  const features = state.boardNotes.filter(
    (n) => n.kind === 'Feature idea' || n.kind === 'Requirement'
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Source strip: the channels being drawn on, with index health */}
      <div className="flex flex-wrap items-center gap-2">
        {state.channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setDrawerChannel(ch)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] transition-colors hover:border-slate-300"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CHANNEL_DOT[ch.status]}`} />
            <span className="font-bold text-slate-800">{ch.label}</span>
            <span className="text-slate-400">· {ch.detail}</span>
          </button>
        ))}

        <button
          onClick={() => addToast('Source picker opened.', 'info')}
          disabled={disabled}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Add channel
        </button>
      </div>

      {/* ── Three columns: sources · board · copilot */}
      <div className="grid min-h-[38rem] grid-cols-1 gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_19rem]">
        {/* Left: files pulled in */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-extrabold text-slate-900">Knowledge sources</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Added so far ({state.sources.length})
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {state.sources.length === 0 ? (
              <p className="px-2 py-6 text-center text-[10px] text-slate-400">
                PRDs, raw requirements, notes, email threads, legacy docs, competitor analysis.
              </p>
            ) : (
              state.sources.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-start gap-2 rounded-xl p-2 transition-colors hover:bg-slate-50"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold text-slate-800">{s.name}</div>
                    <div className="text-[9px] text-slate-400">{s.type} · indexed</div>
                  </div>
                  {!disabled && (
                    <button
                      onClick={() => removeSpecSource(state.projectId, s.id)}
                      className="shrink-0 cursor-pointer text-slate-300 opacity-0 transition-all hover:text-rose-600 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-slate-200 p-3">
            <button
              onClick={() =>
                addSpecSource(
                  state.projectId,
                  `Uploaded document ${state.sources.length + 1}.pdf`,
                  'PDF'
                )
              }
              disabled={disabled}
              className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-2 py-3 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4 text-slate-400" />
              <span className="text-center text-[10px] font-bold leading-tight text-slate-700">
                Drop files or browse
              </span>
              <span className="text-[9px] text-slate-400">PDF, DOCX, TXT</span>
            </button>

            <div className="flex items-center gap-1.5">
              <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && urlValue.trim()) {
                    addSpecSource(state.projectId, urlValue.trim(), 'URL');
                    setUrlValue('');
                  }
                }}
                disabled={disabled}
                placeholder="…or paste a URL"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-[10px] outline-none focus:border-indigo-600 focus:bg-white disabled:cursor-not-allowed"
              />
            </div>

            <button
              onClick={() =>
                confluenceReady
                  ? addSpecSource(state.projectId, 'Confluence — imported space', 'Confluence')
                  : addToast('This needs the Confluence connector. Ask your admin.', 'error')
              }
              disabled={disabled}
              title={confluenceReady ? undefined : 'Ask your admin to activate Confluence.'}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors ${
                confluenceReady && !disabled
                  ? 'cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <BookOpen className="h-3 w-3" />
              Import from Confluence →
            </button>
          </div>
        </aside>

        {/* Middle: the spatial board */}
        <ChalkBoardCanvas
          state={state}
          disabled={disabled}
          selectedIds={selectedNotes}
          onSelectionChange={setSelectedNotes}
        />

        {/* Right: copilot + layer validation */}
        <CopilotPanel state={state} disabled={disabled} selectedCount={selectedNotes.length} />
      </div>

      {/* ── Metrics row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { value: indexed, label: 'Knowledge items indexed' },
          { value: features, label: 'Features identified' },
          { value: conflicts + openFlags.length, label: 'Conflicts & flags open' },
          {
            value: state.chalkBoard.acceptedRequirements,
            label: 'Requirements accepted',
          },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <strong className="block text-xl font-black tracking-tight text-slate-900">
              {m.value}
            </strong>
            <span className="text-[10px] text-slate-500">{m.label}</span>
          </div>
        ))}
      </div>

      {/* ── Flagged questions + archetypes, side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Flagged questions ({state.flaggedQuestions.length})
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Where your sources disagree or leave gaps. Resolve these before locking.
              </p>
            </div>
            <button
              onClick={() =>
                addToast(
                  conflicts > 0
                    ? `${conflicts} conflict${conflicts === 1 ? '' : 's'} identified on the board.`
                    : 'No new conflicts found across your sources.',
                  'info'
                )
              }
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
            >
              <Search className="h-3 w-3" /> Find conflicts
            </button>
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
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-indigo-600"
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

        {/* Archetypes */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <button
            onClick={() => setArchetypesOpen(!archetypesOpen)}
            className="flex w-full cursor-pointer items-start justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              Start from an archetype
            </span>
            <span className="shrink-0 text-[10px] font-bold text-slate-400">
              {archetypesOpen ? 'Hide' : 'Advanced'}
            </span>
          </button>

          {archetypesOpen && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] leading-snug text-slate-500">
                Generates an initial understanding and module skeleton from a reusable pattern.
              </p>

              {ARCHETYPES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => applyArchetype(state.projectId, a.id)}
                  disabled={disabled}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 p-2.5 text-left transition-all hover:border-indigo-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="text-[11px] font-bold text-slate-900">{a.name}</div>
                  <div className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    {a.description}
                  </div>
                </button>
              ))}

              <p className="text-[10px] text-slate-400">
                Which archetypes are available is set by your admin.
              </p>
            </div>
          )}
        </section>
      </div>

      <SourceDrawer channel={drawerChannel} onClose={() => setDrawerChannel(null)} />
    </div>
  );
};
