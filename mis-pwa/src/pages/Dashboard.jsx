import React from 'react';

const Dashboard = () => {
  const alerts = [
    { id: 1, type: 'pm', message: 'PM due: Press Machine 1 - Weekly inspection overdue.' },
    { id: 2, type: 'spare', message: 'Spare below reorder: Bearing 6205 - Qty: 4.' },
    { id: 3, type: 'breakdown', message: 'Breakdown pending: Conveyor Line 3 not acknowledged.' }
  ];

  const getBadge = (type) => {
    if (type === 'pm') return 'bg-amber-500/20 text-amber-300';
    if (type === 'spare') return 'bg-sky-500/20 text-sky-300';
    if (type === 'breakdown') return 'bg-danger/20 text-danger';
    return 'bg-slate-700 text-slate-200';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Dashboard</h2>
      <p className="text-sm text-slate-400">
        Overview of maintenance health, aligned with IATF 16949 and VDA 6.3 expectations.
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Alerts</h3>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
            >
              <span>{alert.message}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${getBadge(alert.type)}`}>
                {alert.type === 'pm' && 'PM Due'}
                {alert.type === 'spare' && 'Spare Low'}
                {alert.type === 'breakdown' && 'Breakdown Pending'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

