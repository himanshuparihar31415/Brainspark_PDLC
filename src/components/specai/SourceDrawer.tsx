import React from 'react';
import { useApp } from '../../context/AppContext';
import { isActivated, isEnabledFor } from '../../data/connectors';
import { SpecSource } from '../../types/specai';
import { INGEST_COPY } from '../../data/specai';
import { RefreshCw, Trash2, X } from 'lucide-react';

/**
 * Detail for one source: where it came from, whether it can be read yet, and what
 * the brief has drawn out of it. Connection state is governed under Connectors,
 * so this explains rather than configures.
 */
export const SourceDrawer: React.FC<{
  source: SpecSource | null;
  onClose: () => void;
}> = ({ source, onClose }) => {
  const { connectors, currentScope, specAiFor, retrySpecSource, removeSpecSource, addToast } =
    useApp();

  if (!source) return null;

  const state = specAiFor(currentScope.projectId ?? '');
  const connector = connectors.find(
    (c) => c.name.toLowerCase() === source.type.toLowerCase()
  );
  const drawnFrom = state.cards.filter((c) => c.sourceId === source.id);

  const rows: { label: string; value: string }[] = [
    { label: 'Kind', value: source.type },
    { label: 'Ingestion', value: INGEST_COPY[source.ingest].label },
    { label: 'Contents', value: source.detail ?? '—' },
    {
      label: 'Connection',
      /* Answered against this project and department rather than a platform
         flag, so a source connected elsewhere no longer reads as connected here. */
      value: connector
        ? isActivated(connector, currentScope.projectId, currentScope.departmentId)
          ? 'Connected for this project'
          : isEnabledFor(connector, currentScope.departmentId)
          ? 'Enabled for the department, not connected here'
          : connector.tenantAvailable
          ? 'Not enabled for this department'
          : 'Withdrawn platform-wide'
        : 'Local to this workspace',
    },
    { label: 'Project', value: currentScope.projectName ?? '—' },
    {
      label: 'Read out of it',
      value: `${drawnFrom.length} ${drawnFrom.length === 1 ? 'extract' : 'extracts'}`,
    },
  ];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/20 animate-in fade-in"
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <strong className="text-sm font-extrabold text-slate-900">{source.name}</strong>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-0">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 py-2.5"
              >
                <span className="text-[11px] text-slate-500">{r.label}</span>
                <b className="text-right text-[11px] font-bold text-slate-900">{r.value}</b>
              </div>
            ))}
          </div>

          {source.ingest === 'Failed' && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] leading-relaxed text-rose-900">
              {source.ingestNote ?? 'Ingestion failed.'} Nothing from this source reached the brief.
            </p>
          )}

          {/* What the brief actually took from here */}
          {drawnFrom.length > 0 && (
            <div className="mt-4">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Read out of this source
              </div>
              <div className="mt-1.5 space-y-1.5">
                {drawnFrom.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2"
                  >
                    <p className="text-[10.5px] font-semibold leading-snug text-slate-800">
                      {c.title}
                    </p>
                    {c.provenance?.excerpt && (
                      <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-slate-500">
                        “{c.provenance.excerpt}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-slate-400">
                The rest of what was read either repeats the problem statement, corroborates
                something already in the brief, or does not bear on it.
              </p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={() => {
                if (source.ingest === 'Failed') {
                  retrySpecSource(state.projectId, source.id);
                } else {
                  addToast(`Re-indexing ${source.name}…`, 'info');
                }
                onClose();
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {source.ingest === 'Failed' ? 'Retry ingestion' : 'Refresh'}
            </button>
            <button
              onClick={() => {
                removeSpecSource(state.projectId, source.id);
                onClose();
              }}
              title="Remove this source"
              className="cursor-pointer rounded-lg border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
