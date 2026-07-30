import React from 'react';
import { ObservabilityRun, RunStatus } from '../../types/observability';
import { PAYLOAD_POLICY_COPY, formatMoney, formatSecs, moduleLabel } from '../../data/observability';
import { ArrowRight } from 'lucide-react';

const STATUS_CHIP: Record<RunStatus, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  partial: 'bg-amber-50 text-amber-800',
  running: 'bg-blue-50 text-blue-700',
};

/** Shared run table. Every row is the entry point to L4. */
export const RunList: React.FC<{
  runs: ObservabilityRun[];
  title: string;
  onOpen: (runId: string) => void;
}> = ({ runs, title, onOpen }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="text-sm font-extrabold tracking-tight text-slate-900">{title}</h2>
    <p className="mt-0.5 text-[11px] text-slate-500">
      Any run expands into its agent and event timeline.
    </p>

    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[46rem] text-left">
        <thead>
          <tr className="border-b border-slate-200">
            {[
              'Run',
              'Module',
              'Who',
              'Env',
              'Status',
              'Duration',
              'Agents',
              'Retries',
              'Spend',
              'Capture',
              '',
            ].map((h) => (
              <th
                key={h}
                className="pb-2 pr-3 text-[9px] font-bold uppercase tracking-wider text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="py-2 pr-3">
                <div className="font-mono text-[10.5px] font-bold text-slate-800">{r.runId}</div>
                <div className="font-mono text-[9px] text-slate-400">{r.capability}</div>
              </td>
              <td className="py-2 pr-3 text-[10.5px] text-slate-600">
                {moduleLabel(r.moduleName)}
              </td>
              <td className="py-2 pr-3 text-[10.5px] text-slate-600">{r.userName}</td>
              <td className="py-2 pr-3">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600">
                  {r.environment}
                </span>
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${STATUS_CHIP[r.status]}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono text-[10px] text-slate-600">
                {formatSecs(r.durationMs)}
              </td>
              <td className="py-2 pr-3 font-mono text-[10px] text-slate-600">{r.totalAgents}</td>
              <td className="py-2 pr-3">
                <span
                  className={`font-mono text-[10px] font-bold ${
                    r.totalRetries > 0 ? 'text-amber-700' : 'text-slate-400'
                  }`}
                >
                  {r.totalRetries}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono text-[10px] font-bold text-slate-800">
                {formatMoney(r.totalCostUsd)}
              </td>
              <td className="py-2 pr-3">
                <span
                  title={PAYLOAD_POLICY_COPY[r.payloadPolicy].hint}
                  className={`cursor-help rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    r.payloadPolicy === 'full' || r.payloadPolicy === 'redacted'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {PAYLOAD_POLICY_COPY[r.payloadPolicy].label}
                </span>
              </td>
              <td className="py-2">
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
