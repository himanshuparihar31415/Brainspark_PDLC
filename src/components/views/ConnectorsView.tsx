import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Connector } from '../../types';
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const ConnectorsView: React.FC = () => {
  const { connectors, toggleConnectorEnabled, activateConnectorProject, currentRole, currentScope } = useApp();

  const [activeModalConnector, setActiveModalConnector] = useState<Connector | null>(null);

  // Form
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [workspaceRepo, setWorkspaceRepo] = useState('');
  const [authError, setAuthError] = useState('');

  const isTenantLevelView = currentRole === 'Super Admin' || currentRole === 'Tenant Admin' || currentScope.type === 'tenant';

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiToken.trim()) {
      setAuthError("Couldn't authenticate. Check the token and endpoint, then try again.");
      return;
    }

    if (activeModalConnector) {
      activateConnectorProject(activeModalConnector.id, endpointUrl, workspaceRepo);
      setActiveModalConnector(null);
      setEndpointUrl('');
      setApiToken('');
      setWorkspaceRepo('');
      setAuthError('');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Connectors</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          {isTenantLevelView
            ? 'Enable connectors for this tenant. Projects can activate only what you enable here.'
            : 'Activate connectors your Tenant Admin has made available.'}
        </p>
      </div>

      {/* Connectors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="py-3 px-4">Connector</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Used by module(s)</th>
                <th className="py-3 px-4">
                  {isTenantLevelView ? 'Tenant Enabled' : 'Project Status'}
                </th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Sync Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {connectors.map((c) => {
                const isLocked = !isTenantLevelView && !c.enabledTenant;

                return (
                  <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${isLocked ? 'bg-slate-50/50 opacity-60' : ''}`}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                          <Plug className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{c.name}</div>
                          {c.endpointUrl && <div className="text-[10px] text-slate-400 font-normal">{c.endpointUrl}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {c.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.usedByModules.map((mod) => (
                          <span
                            key={mod}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isTenantLevelView ? (
                        <button
                          onClick={() => toggleConnectorEnabled(c.id)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            c.enabledTenant
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {c.enabledTenant ? 'Enabled' : 'Disabled'}
                        </button>
                      ) : isLocked ? (
                        <div
                          className="flex items-center gap-1.5 text-slate-400 text-xs cursor-not-allowed"
                          title="Ask your Tenant Admin to enable this connector."
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Not enabled by tenant</span>
                        </div>
                      ) : c.activatedProject ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveModalConnector(c);
                            setEndpointUrl(c.endpointUrl || '');
                            setWorkspaceRepo(c.workspaceRepo || '');
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] ${
                          c.health.includes('Connected') && !c.health.includes('Not')
                            ? 'text-emerald-700 font-bold'
                            : c.health.includes('failed')
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {c.health}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div>{c.syncType}</div>
                      <div className="text-[10px] text-slate-400 font-sans">Last sync {c.lastSyncTime}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6.2 Activation Modal */}
      {activeModalConnector && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Activate {activeModalConnector.name}</h2>
              <button onClick={() => setActiveModalConnector(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Credentials are scoped to this project only and are never visible to other projects.
            </p>

            <form onSubmit={handleActivateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Endpoint URL</label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://lplfinancial.atlassian.net"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">API token / key</label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Workspace / repo</label>
                <input
                  type="text"
                  value={workspaceRepo}
                  onChange={(e) => setWorkspaceRepo(e.target.value)}
                  placeholder="lpl-org/mobile-banking-v2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none font-mono"
                />
              </div>

              {authError && <p className="text-xs text-rose-600 font-semibold">{authError}</p>}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalConnector(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Activate connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
