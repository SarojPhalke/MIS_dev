import React, { useMemo, useState } from 'react';

const PAGE_SIZE = 10;

const KPITable = ({ rows }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('asset_code');
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    let out = safeRows;

    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) =>
        String(r.asset_code || '').toLowerCase().includes(q)
      );
    }

    out = [...out].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }

      const sa = String(va);
      const sb = String(vb);
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Asset KPI Summary</h3>
        <input
          type="text"
          placeholder="Search asset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-40 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort('asset_code')}>
                Asset Code
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort('mttr_minutes')}>
                MTTR (min)
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort('mtbf_hours')}>
                MTBF (h)
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort('availability_pct')}>
                Availability %
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort('uptime_pct')}>
                Uptime %
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort('spare_cost_total')}>
                Spare Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-[11px] text-slate-500"
                >
                  No KPI data found for current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr
                  key={`${row.asset_code}-${idx}`}
                  className="border-b border-slate-800/60 hover:bg-slate-800/60"
                >
                  <td className="px-3 py-2 text-[11px] text-slate-100">
                    {row.asset_code}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-100">
                    {row.mttr_minutes != null ? row.mttr_minutes.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-100">
                    {row.mtbf_hours != null ? row.mtbf_hours.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-100">
                    {row.availability_pct != null ? row.availability_pct.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-100">
                    {row.uptime_pct != null ? row.uptime_pct.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-100">
                    {row.spare_cost_total != null ? row.spare_cost_total.toFixed(2) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default KPITable;

