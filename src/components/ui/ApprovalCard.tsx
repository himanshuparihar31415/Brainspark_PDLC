import React from 'react';
import { CheckCircle2, XCircle, Edit3, Clock, AlertTriangle } from 'lucide-react';
import { ConfidenceBadge, ConfidenceLevel } from './ConfidenceBadge';

export interface ApprovalRequest {
  id: string;
  title: string;
  agent: string;
  description: string;
  confidence: ConfidenceLevel;
  impact?: string;
  requestedAt: string;
  context?: React.ReactNode;
}

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify?: (id: string) => void;
  className?: string;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  request,
  onApprove,
  onReject,
  onModify,
  className = '',
}) => (
  <div className={`material-acrylic elevation-rest rounded-2xl border border-white/60 overflow-hidden ${className}`}>
    {/* Header */}
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="type-body-strong truncate text-slate-900">{request.title}</span>
        </div>
        <div className="mt-1 type-caption text-slate-500">
          Requested by <span className="font-bold text-indigo-600">{request.agent}</span> · {request.requestedAt}
        </div>
      </div>
      <ConfidenceBadge level={request.confidence} showLabel={false} />
    </div>

    {/* Body */}
    <div className="px-4 py-3 space-y-2">
      <p className="type-body text-slate-700">{request.description}</p>
      {request.impact && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="type-caption font-medium text-amber-800">{request.impact}</span>
        </div>
      )}
      {request.context && <div className="mt-2">{request.context}</div>}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
      <button
        onClick={() => onApprove(request.id)}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 type-body-strong text-white transition-colors hover:bg-emerald-700 cursor-pointer"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        onClick={() => onReject(request.id)}
        className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 type-body-strong text-rose-700 transition-colors hover:bg-rose-100 cursor-pointer"
      >
        <XCircle className="h-3.5 w-3.5" /> Reject
      </button>
      {onModify && (
        <button
          onClick={() => onModify(request.id)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 type-body-strong text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
        >
          <Edit3 className="h-3.5 w-3.5" /> Modify
        </button>
      )}
    </div>
  </div>
);
