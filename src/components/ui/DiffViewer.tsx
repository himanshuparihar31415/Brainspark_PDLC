import React, { useState } from 'react';
import { Minus, Plus, Eye } from 'lucide-react';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

interface DiffViewerProps {
  lines: DiffLine[];
  title?: string;
  language?: string;
  mode?: 'inline' | 'side-by-side';
  onAcceptHunk?: (startLine: number) => void;
  onRejectHunk?: (startLine: number) => void;
  className?: string;
}

const LINE_STYLES: Record<DiffLine['type'], { bg: string; border: string; prefix: string; icon: React.ElementType }> = {
  added: { bg: 'bg-emerald-50/60', border: 'border-l-emerald-400', prefix: '+', icon: Plus },
  removed: { bg: 'bg-rose-50/60', border: 'border-l-rose-400', prefix: '-', icon: Minus },
  unchanged: { bg: '', border: 'border-l-transparent', prefix: ' ', icon: Eye },
};

export const DiffViewer: React.FC<DiffViewerProps> = ({
  lines,
  title,
  mode = 'inline',
  className = '',
}) => {
  const [showUnchanged, setShowUnchanged] = useState(true);
  const stats = {
    added: lines.filter((l) => l.type === 'added').length,
    removed: lines.filter((l) => l.type === 'removed').length,
  };

  const visibleLines = showUnchanged ? lines : lines.filter((l) => l.type !== 'unchanged');

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-50/60 px-4 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {title && <span className="type-body-strong text-slate-800">{title}</span>}
          <span className="flex items-center gap-1.5 type-caption">
            <span className="font-bold text-emerald-600">+{stats.added}</span>
            <span className="font-bold text-rose-600">-{stats.removed}</span>
          </span>
        </div>
        <button
          onClick={() => setShowUnchanged(!showUnchanged)}
          className="type-caption font-bold text-indigo-600 hover:underline cursor-pointer"
        >
          {showUnchanged ? 'Hide unchanged' : 'Show all'}
        </button>
      </div>

      {/* Diff body */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <tbody>
            {visibleLines.map((line, i) => {
              const style = LINE_STYLES[line.type];
              return (
                <tr key={i} className={`${style.bg} border-l-2 ${style.border}`}>
                  <td className="w-10 select-none px-2 py-0.5 text-right font-mono type-caption text-slate-300">
                    {line.lineNumber ?? i + 1}
                  </td>
                  <td className="w-5 select-none px-1 py-0.5 font-mono type-caption text-slate-400">
                    {style.prefix}
                  </td>
                  <td className="px-2 py-0.5 font-mono type-caption text-slate-800 whitespace-pre">
                    {line.content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
