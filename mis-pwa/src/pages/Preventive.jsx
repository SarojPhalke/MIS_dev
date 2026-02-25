import React from 'react';

const mockPm = [
  { id: 1, asset: 'Press Machine 1', frequency: 'Weekly', nextDue: '2026-03-01' },
  { id: 2, asset: 'CNC Machine 2', frequency: 'Monthly', nextDue: '2026-03-10' }
];

const Preventive = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Preventive Maintenance</h2>
      <p className="text-sm text-slate-400">
        Upcoming preventive maintenance activities. (Mock data)
      </p>

      <div className="space-y-2">
        {mockPm.map((pm) => (
          <div
            key={pm.id}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
          >
            <p className="font-medium text-slate-100">{pm.asset}</p>
            <p className="text-slate-400">
              Frequency: {pm.frequency} · Next Due: {pm.nextDue}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Preventive;

