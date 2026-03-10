import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

const PMDashboard = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await client.get('/pm/stats');
      return res.data?.data ?? res.data;
    } catch (err) {
      console.error('PM stats error:', err);
      return null;
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await client.get('/pm/schedule');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('PM schedules error:', err);
      return [];
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [s, sch] = await Promise.all([fetchStats(), fetchSchedules()]);
      setStats(s);
      setSchedules(sch);
    } catch (err) {
      console.error('PM load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const toDateInputValue = (value) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Preventive Maintenance Dashboard</h2>
          <p className="text-sm text-slate-400">
            Overview of PM schedules, compliance, and overdue activities.
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission('create_pm_schedule') && (
            <button
              type="button"
              onClick={() => navigate('/preventive/schedule')}
              className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
            >
              Manage Schedule
            </button>
          )}
          {hasPermission('create_pm_entry') && (
            <button
              type="button"
              onClick={() => navigate('/preventive/entry')}
              className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
            >
              Create PM Entry
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">PM Statistics</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Total Scheduled</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">
              {stats?.total_scheduled ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Scheduled</p>
            <p className="mt-1 text-xl font-semibold text-blue-300">{stats?.scheduled ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Overdue</p>
            <p className="mt-1 text-xl font-semibold text-red-300">{stats?.overdue ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Completed (Month)</p>
            <p className="mt-1 text-xl font-semibold text-green-300">
              {stats?.completed_this_month ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Compliance %</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">
              {stats?.compliance_percentage ?? 0}%
            </p>
          </div>
        </div>
      </section>

      {/* Overdue Schedules */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Overdue PM Schedules</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="space-y-2">
              {schedules
                .filter((s) => s.is_overdue)
                .map((schedule) => (
                  <div
                    key={schedule.id}
                    className="rounded-md border border-red-500/30 bg-red-500/10 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-red-300">
                          {schedule.pm_title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {schedule.asset_code || schedule.asset_name || 'Unknown Asset'}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-300">
                          Due: {toDateInputValue(schedule.next_pm_date)}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-300">
                        OVERDUE
                      </span>
                    </div>
                  </div>
                ))}
              {schedules.filter((s) => s.is_overdue).length === 0 && (
                <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-400">
                  No overdue PM schedules.
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Quick Actions */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/preventive/entries')}
            className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-left text-xs hover:bg-slate-800"
          >
            <p className="font-semibold text-slate-100">View Ongoing PMs</p>
            <p className="mt-1 text-slate-400">See all active PM entries</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/preventive/compliance')}
            className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-left text-xs hover:bg-slate-800"
          >
            <p className="font-semibold text-slate-100">PM Compliance</p>
            <p className="mt-1 text-slate-400">View compliance reports</p>
          </button>
          {hasPermission('create_pm_schedule') && (
            <button
              type="button"
              onClick={() => navigate('/preventive/schedule')}
              className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-left text-xs hover:bg-slate-800"
            >
              <p className="font-semibold text-slate-100">Manage Schedule</p>
              <p className="mt-1 text-slate-400">Add or edit PM schedules</p>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default PMDashboard;
