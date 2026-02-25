import React from 'react';

const KPI = () => {
  const mockKpi = {
    mttr: '1.8 h',
    mtbf: '120 h',
    uptime: '97.5 %'
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">KPI Monitoring & Reports</h2>
      <p className="text-sm text-slate-400">
        High-level KPIs for maintenance performance (mock values).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">MTTR</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{mockKpi.mttr}</p>
          <p className="mt-1 text-[11px] text-slate-400">Mean Time To Repair</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">MTBF</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{mockKpi.mtbf}</p>
          <p className="mt-1 text-[11px] text-slate-400">Mean Time Between Failures</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Uptime</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{mockKpi.uptime}</p>
          <p className="mt-1 text-[11px] text-slate-400">Equipment availability</p>
        </div>
      </div>
    </div>
  );
};

export default KPI;

