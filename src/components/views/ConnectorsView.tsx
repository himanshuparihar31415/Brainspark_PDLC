import React, { useMemo, useState } from 'react';
import { Connector } from '../../types';
import { useApp } from '../../context/AppContext';
import { canManageConnector, connectorCapabilities } from '../../data/rbac';
import {
  ConnectorAction,
  DESTRUCTIVE,
  activationFor,
  blastRadius,
  cardState,
  drillFor,
  effectiveScope,
  lensFor,
} from '../../data/connectors';
import { ScopeFilterBar, useScopeFilter } from '../common/ScopeFilterBar';
import { ConnectorCard } from '../connectors/ConnectorCard';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';

/** Explains the tier the signed-in role sits at, in its own words. */
const TIER_BLURB: Record<string, { title: string; body: string }> = {
  'tenant-availability': {
    title: 'Platform authority',
    body: 'You decide which connectors exist for departments at all. Withdrawing one clears every department and project binding beneath it.',
  },
  'department-baseline': {
    title: 'Department authority',
    body: 'You enable connectors for your department from what the platform makes available. Projects can activate only what you enable.',
  },
  'project-activation': {
    title: 'Project authority',
    body: 'You connect connectors your Department Admin has enabled, using credentials scoped to this project.',
  },
};

const LENS_NOTE: Record<string, string> = {
  tenant: 'How far each connector has spread, and what withdrawing one would cost.',
  department: 'What your department has enabled, and how much of it your projects use.',
  project: 'What this project is connected to, and whether it is working.',
};

/**
 * Connectors.
 *
 * One card per connector, and the card reads differently depending on which
 * rung of the ladder you are standing on: a tenant asks who is using this, a
 * department asks how much of my estate has it, a project asks whether mine is
 * working. Three readings of one record, each answering the question that rung
 * actually has.
 *
 * The rung is not a preference — it is the narrower of what your role permits
 * and what scope you have selected (see `lensFor`). A Tenant Admin filtered to
 * one project gets the project reading, because that is the question they just
 * asked. That is also what makes the scope filter load-bearing here rather than
 * decorative.
 *
 * This replaced a table with a column per tier. The columns existed to show
 * three tiers at once, which is exactly what the lens says you never want.
 */
export const ConnectorsView: React.FC = () => {
  const {
    connectors,
    projects,
    departments,
    currentScope,
    currentRole,
    setConnectorTenantAvailability,
    setConnectorDepartmentEnabled,
    activateConnectorProject,
    testConnectorConnection,
  } = useApp();

  const [filter, setFilter] = useScopeFilter();
  const [connectModal, setConnectModal] = useState<{ connector: Connector; projectId: string } | null>(
    null
  );
  const [confirm, setConfirm] = useState<{
    connector: Connector;
    action: 'withdraw' | 'disable';
    /** Which department a Disable is aimed at — a drill row is not the scope. */
    departmentId?: string;
  } | null>(null);

  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [workspaceRepo, setWorkspaceRepo] = useState('');
  const [authError, setAuthError] = useState('');

  const scope = effectiveScope(filter, currentScope);
  const lens = lensFor(currentRole, scope);

  const department = departments.find((d) => d.id === scope.departmentId);
  const project = projects.find((p) => p.id === scope.projectId);
  const topCapability = connectorCapabilities(currentRole)[0];

  /* Whether this role may act at the rung it is currently reading. A Tenant
     Admin holds every rung, so they can act at all three; a Department Admin
     reading a project card cannot connect it. */
  const canEdit =
    lens === 'tenant'
      ? canManageConnector(currentRole, 'tenant-availability')
      : lens === 'department'
      ? canManageConnector(currentRole, 'department-baseline')
      : canManageConnector(currentRole, 'project-activation');

  /* Drill rows act on the rung *below* the one being read, so they carry their
     own permission: a tenant enabling a department needs department-baseline,
     a department connecting a project needs project-activation. Both are held
     by the roles that can reach those rows, but the check belongs here rather
     than being assumed. */
  const canEditBelow =
    lens === 'tenant'
      ? canManageConnector(currentRole, 'department-baseline')
      : canManageConnector(currentRole, 'project-activation');

  const ctx = useMemo(
    () => ({
      projects,
      departmentCount: departments.length,
      departmentId: scope.departmentId,
      departmentName: department?.name,
      projectId: scope.projectId,
      canEdit,
    }),
    [projects, departments.length, scope.departmentId, department?.name, scope.projectId, canEdit]
  );

  const contextLine =
    lens === 'project'
      ? `Project · ${project?.name ?? 'none selected'}`
      : lens === 'department'
      ? `Department · ${department?.name ?? 'none selected'}`
      : 'Tenant · all departments';

  /**
   * `targetId` is the department or project a drill row stands for. Without a
   * row it falls back to the selected scope, which is what the card's own
   * action row means.
   */
  const run = (connector: Connector, action: ConnectorAction, targetId?: string) => {
    const departmentId = targetId ?? scope.departmentId;
    const projectId = targetId ?? scope.projectId;

    if (DESTRUCTIVE.includes(action)) {
      setConfirm({
        connector,
        action: action as 'withdraw' | 'disable',
        departmentId,
      });
      return;
    }

    switch (action) {
      case 'make-available':
        setConnectorTenantAvailability(connector.id, true);
        return;
      case 'enable':
        if (departmentId) setConnectorDepartmentEnabled(connector.id, departmentId, true);
        return;
      case 'connect':
      case 'configure': {
        if (!projectId) return;
        const existing = activationFor(connector, projectId);
        setEndpointUrl(existing?.endpointUrl ?? '');
        setWorkspaceRepo(existing?.workspaceRepo ?? '');
        setApiToken('');
        setAuthError('');
        setConnectModal({ connector, projectId });
        return;
      }
      case 'test':
      case 'retry':
        if (projectId) testConnectorConnection(connector.id, projectId);
        return;
      default:
        return;
    }
  };

  const commitConfirm = () => {
    if (!confirm) return;
    if (confirm.action === 'withdraw') {
      setConnectorTenantAvailability(confirm.connector.id, false);
    } else if (confirm.departmentId) {
      setConnectorDepartmentEnabled(confirm.connector.id, confirm.departmentId, false);
    }
    setConfirm(null);
  };

  const submitConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiToken.trim()) {
      setAuthError("Couldn't authenticate. Check the token and endpoint, then try again.");
      return;
    }
    if (connectModal) {
      activateConnectorProject(
        connectModal.connector.id,
        connectModal.projectId,
        endpointUrl,
        workspaceRepo
      );
    }
    setConnectModal(null);
    setEndpointUrl('');
    setApiToken('');
    setWorkspaceRepo('');
    setAuthError('');
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in space-y-6 p-6 duration-200 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Connectors
          </h1>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">{LENS_NOTE[lens]}</p>
        </div>
        {/* The resolved reading, said plainly. Replaces the prototype's role
            switcher — the rung is derived, never chosen. */}
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
          {contextLine}
        </span>
      </div>

      {topCapability && (
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-indigo-600" />
          <div className="text-xs leading-relaxed text-indigo-900">
            <span className="font-bold">
              {TIER_BLURB[topCapability].title} · {currentRole}.{' '}
            </span>
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

      {/* A project reading with no project selected has nothing true to say. */}
      {lens === 'project' && !scope.projectId ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-xs text-slate-500">
          Select a project to see what it is connected to.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.map((c) => (
            <ConnectorCard
              key={c.id}
              connector={c}
              state={cardState(c, lens, ctx)}
              drill={drillFor(c, lens, {
                projects,
                departments,
                departmentId: scope.departmentId,
                canEditBelow,
              })}
              onAction={(a, targetId) => run(c, a, targetId)}
            />
          ))}
        </div>
      )}

      {/* ── Destructive confirmation, with the count it is about to destroy ── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md animate-in zoom-in-95 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">
                {confirm.action === 'withdraw'
                  ? `Withdraw ${confirm.connector.name} platform-wide?`
                  : `Disable ${confirm.connector.name} for ${
                      departments.find((d) => d.id === confirm.departmentId)?.name ??
                      'this department'
                    }?`}
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {blastRadius(confirm.connector, confirm.action, {
                projects,
                departmentId: confirm.departmentId,
                departmentName: departments.find((d) => d.id === confirm.departmentId)?.name,
              })}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirm(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={commitConfirm}
                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700"
              >
                {confirm.action === 'withdraw' ? 'Withdraw' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Connect / configure, per project ── */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md animate-in zoom-in-95 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Connect {connectModal.connector.name}
              </h2>
              <button
                onClick={() => setConnectModal(null)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Credentials are scoped to{' '}
              {projects.find((p) => p.id === connectModal.projectId)?.name ?? 'this project'} only
              and are never visible to other projects.
            </p>

            <form onSubmit={submitConnect} className="space-y-4 text-xs">
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
                  onClick={() => setConnectModal(null)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-md hover:bg-indigo-700"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
