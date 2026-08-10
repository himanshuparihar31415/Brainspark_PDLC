import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles } from 'lucide-react';

export const MyServicesView: React.FC = () => {
  const { agents, currentRole } = useApp();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Status of the AI-powered features you rely on in your active module context ({currentRole}). Read-only.
        </p>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No AI-powered features are wired into your module yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Capability</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <Sparkles
                          className={`w-4 h-4 shrink-0 ${
                            a.is_active ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <div>{a.name}</div>
                          {a.is_active ? (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                              {a.description}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-700 font-normal mt-0.5">
                              This feature is currently unavailable — its agent has been deactivated
                              in the catalogue.
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {a.module_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          a.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {a.is_active ? '● Available' : '○ Offline'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {a.model ?? <span className="font-sans font-normal text-slate-400">Platform default</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
