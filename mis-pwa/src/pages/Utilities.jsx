import React from 'react';

const Utilities = () => {
  const mockUtilities = [
    { id: 1, name: 'Compressed Air', status: 'Stable', kpi: '6.5 bar' },
    { id: 2, name: 'Chilled Water', status: 'Attention', kpi: '9°C → 11°C' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Utilities Monitoring</h2>
      <p className="text-sm text-slate-400">
        High-level view of critical utilities supporting production. (Mock data)
      </p>

      <div className="space-y-2">
        {mockUtilities.map((u) => (
          <div
            key={u.id}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
          >
            <p className="font-medium text-slate-100">{u.name}</p>
            <p className="text-slate-400">
              Status: {u.status} · KPI: {u.kpi}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Utilities;

