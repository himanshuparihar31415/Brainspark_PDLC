import React, { useState } from 'react';
import { Connector } from '../../types';
import { useApp } from '../../context/AppContext';
import { canManageConnector, connectorCapabilities } from '../../data/rbac';
import { ScopeFilterBar, useScopeFilter } from '../common/ScopeFilterBar';
import {
  Plug,
  X,
  Lock,
  Check,
  Globe,
  Building2,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';

/** Explains the tier the signed-in role sits at, in its own words. */
const TIER_BLURB: Record<string, { title: string; body: string }> = {
  'platform-availability': {
    title: 'Platform authority',
    body: 'You decide which connectors exist for tenants at all. Withdrawing one clears every tenant and project binding beneath it.',
  },
  'tenant-baseline': {
    title: 'Tenant authority',
    body: 'You enable connectors for your tenant from what the platform makes available. Projects can activate only what you enable.',
  },
  'project-activation': {
    title: 'Project authority',
    body: 'You activate connectors your Department Admin has enabled, using credentials scoped to this project.',
  },
};

export const ConnectorsView: React.FC = () => {
  const {
    connectors,
    projects,
    setConnectorPlatformAvailability,
    toggleConnectorEnabled,
    activateConnectorProject,
    currentRole,
  } = useApp();

  const [filter, setFilter] = useScopeFilter();
  const [activeModalConnector, setActiveModalConnector] = useState<Connector | null>(null);

  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [workspaceRepo, setWorkspaceRepo] = useState('');
  const [authError, setAuthError] = useState('');

  // Ladder: each tier holds everything below it.
  const canSetPlatform = canManageConnector(currentRole, 'platform-availability');
  const canSetTenant = canManageConnector(currentRole, 'tenant-baseline');
  const canActivate = canManageConnector(currentRole, 'project-activation');
  const topCapability = connectorCapabilities(currentRole)[0];

  const scopeLabel =
    filter.projectId !== 'all'
      ? projects.find((p) => p.id === filter.projectId)?.name
      : filter.tenantId !== 'all'
      ? 'selected tenant'
      : 'all tenants';

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
    <div className="mx-auto max-w-7xl animate-in fade-in space-y-6 p-6 duration-200 md:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          Connectors
        </h1>
        <p className="mt-1 text-xs text-slate-500 md:text-sm">
          Integration availability, tenant enablement and project activation — each set at its own
          level.
        </p>
      </div>

      {/* Which rung of the ladder the current role stands on */}
      {topCapability && (
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-indigo-600" />
          <div className="text-xs leading-relaxed text-indigo-900">
            <span className="font-bold">{TIER_BLURB[topCapability].title} · {currentRole}. </span>
            {TIER_BLURB[topCapability].body}
          </div>
        </div>
      )}

      <ScopeFilterBar
        value={filter}
        onChange={setFilter}
        resultCount={connectors.length}
        resultNoun="connectors"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">Connector</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Used by module(s)</th>
                {/* The platform column exists only for the tier that owns it. */}
                {canSetPlatform && (
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Platform
                    </span>
                  </th>
                )}
                {canSetTenant && (
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Tenant
                    </span>
                  </th>
                )}
                <th className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <FolderGit2 className="h-3 w-3" /> Project
                  </span>
                </th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {connectors.map((c) => {
                // A row is inert for this role when a tier above it is closed.
                const withdrawn = !c.platformAvailable;
                const notEnabled = c.platformAvailable && !c.enabledTenant;
                const dimmed = canSetPlatform ? false : withdrawn || notEnabled;

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      dimmed ? 'bg-slate-50/50 opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                          <Plug className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate">{c.name}</div>
                          {c.endpointUrl && (
                            <div className="truncate text-[10px] font-normal text-slate-400">
                              {c.endpointUrl}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-600">{c.category}</td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.usedByModules.map((mod) => (
                          <span
                            key={mod}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Tier 1 — platform availability */}
                    {canSetPlatform && (
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setConnectorPlatformAvailability(c.id, !c.platformAvailable)}
                          title={
                            c.platformAvailable
                              ? 'Withdraw platform-wide. Clears tenant and project bindings.'
                              : 'Make available to tenants.'
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                            c.platformAvailable
                              ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {c.platformAvailable ? 'Available' : 'Withdrawn'}
                        </button>
                      </td>
                    )}

                    {/* Tier 2 — tenant baseline */}
                    {canSetTenant && (
                      <td className="px-4 py-3.5">
                        {withdrawn ? (
                          <div
                            className="flex cursor-not-allowed items-center gap-1.5 text-xs text-slate-400"
                            title="Withdrawn platform-wide by a Tenant Admin."
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Not available</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleConnectorEnabled(c.id)}
                            title={
                              c.enabledTenant
                                ? 'Disable for this tenant. Clears project activations.'
                                : 'Enable for this tenant.'
                            }
                            className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                              c.enabledTenant
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {c.enabledTenant ? 'Enabled' : 'Disabled'}
                          </button>
                        )}
                      </td>
                    )}

                    {/* Tier 3 — project activation */}
                    <td className="px-4 py-3.5">
                      {withdrawn ? (
                        <div
                          className="flex cursor-not-allowed items-center gap-1.5 text-xs text-slate-400"
                          title="Withdrawn platform-wide."
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Unavailable</span>
                        </div>
                      ) : notEnabled ? (
                        <div
                          className="flex cursor-not-allowed items-center gap-1.5 text-xs text-slate-400"
                          title="Ask your Department Admin to enable this connector."
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Not enabled by tenant</span>
                        </div>
                      ) : c.activatedProject ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <Check className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : canActivate ? (
                        <button
                          onClick={() => {
                            setActiveModalConnector(c);
                            setEndpointUrl(c.endpointUrl || '');
                            setWorkspaceRepo(c.workspaceRepo || '');
                          }}
                          className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700"
                        >
                          Activate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Not activated</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-medium">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] ${
                          c.health.includes('Connected') && !c.health.includes('Not')
                            ? 'font-bold text-emerald-700'
                            : c.health.includes('failed')
                            ? 'font-bold text-amber-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {c.health}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                      <div>{c.syncType}</div>
                      <div className="font-sans text-[10px] text-slate-400">
                        Last sync {c.lastSyncTime}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activation modal */}
      {activeModalConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md animate-in zoom-in-95 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Activate {activeModalConnector.name}
              </h2>
              <button
                onClick={() => setActiveModalConnector(null)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Credentials are scoped to {scopeLabel} only and are never visible to other projects.
            </p>

            <form onSubmit={handleActivateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Endpoint URL</label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://incedolabs.atlassian.net"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">API token / key</label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Workspace / repo</label>
                <input
                  type="text"
                  value={workspaceRepo}
                  onChange={(e) => setWorkspaceRepo(e.target.value)}
                  placeholder="incedolabs/mobile-banking-v2"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              {authError && <p className="text-xs font-semibold text-rose-600">{authError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalConnector(null)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-md hover:bg-indigo-700"
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
