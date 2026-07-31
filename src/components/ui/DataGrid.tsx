import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  compact?: boolean;
  className?: string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataGrid<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  searchable,
  searchPlaceholder = 'Filter rows…',
  onRowClick,
  emptyMessage = 'No data available.',
  pageSize = 20,
  compact = false,
  className = '',
}: DataGridProps<T>) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortCol(null);
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const density = compact ? 'density-compact' : '';
  const rowH = compact ? 'h-[28px]' : 'h-[36px]';

  return (
    <div className={`space-y-3 ${density} ${className}`}>
      {searchable && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200/80 bg-white/60 py-1.5 pl-8 pr-3 type-body text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 type-caption font-bold uppercase tracking-wider text-slate-400 ${rowH} ${
                      col.sortable ? 'cursor-pointer select-none hover:text-slate-600' : ''
                    }`}
                    style={{ width: col.width, textAlign: col.align ?? 'left' }}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortCol === col.key && (
                        sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center type-body text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`${rowH} transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-indigo-50/40' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 type-body text-slate-700"
                        style={{ textAlign: col.align ?? 'left' }}
                      >
                        {col.render ? col.render(row, i + page * pageSize) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <span className="type-caption text-slate-400">
              {sorted.length} rows · page {page + 1}/{totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded-md border border-slate-200 px-2 py-0.5 type-caption font-bold text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="rounded-md border border-slate-200 px-2 py-0.5 type-caption font-bold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
