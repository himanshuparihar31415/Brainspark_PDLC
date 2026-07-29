import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  Lock,
  FileCheck2,
  X,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building,
  User,
  Trash2,
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  const {
    sessions,
    updateSessionConfig,
    revokeApiKey,
    sensitiveLogs,
    auditLogs,
    exportEvidencePackage,
    currentScope,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rbac' | 'sessions' | 'sensitive' | 'audit' | 'compliance'>('rbac');
  const [explainUserDrawer, setExplainUserDrawer] = useState<string | null>(null);

  // Audit filters
  const [actorFilter, setActorFilter] = useState<'All' | 'user' | 'agent'>('All');
  const [auditSearch, setAuditSearch] = useState('');

  const rbacMatrix: { role: Role; view: boolean; create: boolean; edit: boolean; approve: boolean; export: boolean }[] = [
    { role: 'Super Admin', view: true, create: true, edit: true, approve: true, export: true },
    { role: 'Tenant Admin', view: true, create: true, edit: true, approve: true, export: true },
    { role: 'Project Admin', view: true, create: true, edit: true, approve: true, export: true },
    { role: 'Product Manager', view: true, create: true, edit: true, approve: true, export: false },
    { role: 'Architect', view: true, create: false, edit: true, approve: true, export: false },
    { role: 'Designer', view: true, create: false, edit: true, approve: false, export: false },
    { role: 'Tech Lead', view: true, create: true, edit: true, approve: true, export: false },
    { role: 'Developer', view: true, create: false, edit: true, approve: false, export: false },
    { role: 'QA Manager', view: true, create: true, edit: true, approve: true, export: true },
    { role: 'QA Engineer', view: true, create: false, edit: true, approve: false, export: false },
    { role: 'Release Manager', view: true, create: true, edit: true, approve: true, export: true },
  ];

  const filteredAuditLogs = auditLogs.filter((entry) => {
    if (actorFilter !== 'All' && entry.actorType !== actorFilter) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      return (
        entry.actor.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.targetArtifact.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Security & Compliance</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Governance controls, RBAC permission matrix, session rules, PII masking, append-only audit trail, and regulatory compliance.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'rbac' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Access (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'sessions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('sensitive')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'sensitive' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sensitive data
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit log
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'compliance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Compliance
        </button>
      </div>

      {/* 10.1 RBAC Tab */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Role permissions in {currentScope.tenantName || 'Platform'}</h2>
            <button
              onClick={() => setExplainUserDrawer('Sarah Jenkins')}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Explain this access
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">View</th>
                    <th className="py-3 px-4 text-center">Create</th>
                    <th className="py-3 px-4 text-center">Edit</th>
                    <th className="py-3 px-4 text-center">Approve</th>
                    <th className="py-3 px-4 text-center">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rbacMatrix.map((r) => (
                    <tr key={r.role} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.role}</td>
                      <td className="py-3 px-4 text-center">{r.view ? '✓' : '—'}</td>
                      <td className="py-3 px-4 text-center">{r.create ? '✓' : '—'}</td>
                      <td className="py-3 px-4 text-center">{r.edit ? '✓' : '—'}</td>
                      <td className="py-3 px-4 text-center">{r.approve ? '✓' : '—'}</td>
                      <td className="py-3 px-4 text-center">{r.export ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10.2 Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Session Configuration</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Session timeout</label>
                <select
                  value={sessions.sessionTimeoutMinutes}
                  onChange={(e) => updateSessionConfig({ sessionTimeoutMinutes: Number(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-indigo-600 font-semibold"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes (Default)</option>
                  <option value={60}>1 hour</option>
                  <option value={240}>4 hours</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Applies to all users in this tenant.</p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">Require Multi-Factor Authentication (MFA)</div>
                  <div className="text-[11px] text-slate-500">Enforces hardware token or authenticator app.</div>
                </div>
                <input
                  type="checkbox"
                  checked={sessions.requireMFA}
                  onChange={(e) => updateSessionConfig({ requireMFA: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max concurrent sessions</label>
                <input
                  type="number"
                  value={sessions.maxConcurrentSessions}
                  onChange={(e) => updateSessionConfig({ maxConcurrentSessions: Number(e.target.value) })}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 outline-none focus:border-indigo-600 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Service API Keys</h2>
            <div className="space-y-2">
              {sessions.apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{k.name}</div>
                    <div className="text-[10px] text-slate-400">Created {k.created} · Last used {k.lastUsed}</div>
                  </div>
                  <button
                    onClick={() => revokeApiKey(k.id)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px]"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10.3 Sensitive Data Tab */}
      {activeTab === 'sensitive' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Encryption at rest (AES-256) and in transit (TLS 1.2+) is always on.</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-4">Document / Input</th>
                    <th className="py-3 px-4">Detection</th>
                    <th className="py-3 px-4">Action Taken</th>
                    <th className="py-3 px-4">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sensitiveLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-800">{log.documentInput}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px] border border-rose-200">
                          {log.detection}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{log.actionTaken}</td>
                      <td className="py-3.5 px-4 text-slate-400">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10.4 Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Audit log</h2>
              <p className="text-[11px] text-slate-400">Tamper-evident, append-only. Read-only.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-semibold"
              >
                <option value="All">All Actors</option>
                <option value="user">Users (👤)</option>
                <option value="agent">Agents (⚙)</option>
              </select>

              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit entries..."
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">No matching audit entries.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Artifact</th>
                      <th className="py-3 px-4">Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {log.actorType === 'user' ? `👤 ${log.actor}` : `⚙ ${log.actor}`}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-700">{log.action}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-800">{log.targetArtifact}</td>
                        <td className="py-3.5 px-4 text-slate-500">{log.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10.5 Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Regulatory Frameworks & Evidence</h2>
                <p className="text-xs text-slate-400">Active platform governance compliance baselines</p>
              </div>

              <button
                onClick={exportEvidencePackage}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Generate evidence package</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-base font-black text-slate-900">SOC 2 Type II</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-2 inline-block">
                  Applicable
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-base font-black text-slate-900">ISO 27001</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-2 inline-block">
                  Applicable
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-base font-black text-slate-900">GDPR</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-2 inline-block">
                  Applicable
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-base font-black text-slate-900">HIPAA</div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-2 inline-block">
                  Not configured
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <button
                onClick={exportEvidencePackage}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl"
              >
                Export audit log
              </button>
              <button
                onClick={exportEvidencePackage}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl"
              >
                Export access report
              </button>
              <button
                onClick={exportEvidencePackage}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl"
              >
                Export data-processing records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explain Access Drawer */}
      {explainUserDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Effective permissions for {explainUserDrawer}
                </h2>
                <button onClick={() => setExplainUserDrawer(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-950 font-medium">
                  Computed Role: Project Admin + Product Manager (Mobile Banking V2)
                </div>
                <ul className="space-y-1.5 text-slate-700">
                  <li className="flex items-center gap-2">✓ Read/Write access to SpecAI module</li>
                  <li className="flex items-center gap-2">✓ Can approve human-in-the-loop task artifacts</li>
                  <li className="flex items-center gap-2">✓ Can submit prompt candidates</li>
                  <li className="flex items-center gap-2 text-rose-600">✗ Cannot deactivate tenant</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setExplainUserDrawer(null)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
