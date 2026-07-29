import React from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeChannel } from '../../types/specai';
import { RefreshCw, X } from 'lucide-react';

/**
 * Detail for one knowledge channel. Read-only by design: connection state is
 * governed under Connectors, so this explains rather than configures.
 */
export const SourceDrawer: React.FC<{
  channel: KnowledgeChannel | null;
  onClose: () => void;
}> = ({ channel, onClose }) => {
  const { connectors, currentScope, addToast } = useApp();

  if (!channel) return null;

  const connector = connectors.find((c) => c.id === channel.connectorId);

  const rows: { label: string; value: string }[] = [
    {
      label: 'Connection',
      value: connector
        ? connector.activatedProject
          ? 'Activated for this project'
          : connector.enabledTenant
          ? 'Enabled for tenant, not activated'
          : 'Not enabled'
        : 'Local to this workspace',
    },
    { label: 'Knowledge index', value: channel.status },
    { label: 'Selected project', value: currentScope.projectName ?? '—' },
    { label: 'Items indexed', value: channel.itemsIndexed.toLocaleString() },
    { label: 'Last sync', value: channel.lastSync },
    {
      label: 'Embedding status',
      value: channel.status === 'Ready' ? 'Healthy' : channel.status === 'Indexing' ? 'Building' : '—',
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
          <strong className="text-sm font-extrabold text-slate-900">
            {channel.label} context
          </strong>
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
                <b className="text-[11px] font-bold text-slate-900">{r.value}</b>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              addToast(`Re-indexing ${channel.label}…`, 'info');
              onClose();
            }}
            className="mt-5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh knowledge
          </button>

          {connector && !connector.activatedProject && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
              This channel depends on the {connector.name} connector. Ask your admin to activate it
              for this project.
            </p>
          )}
        </div>
      </aside>
    </>
  );
};
