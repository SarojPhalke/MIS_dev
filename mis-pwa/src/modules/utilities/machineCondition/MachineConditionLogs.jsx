import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const MachineConditionLogs = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [filters, setFilters] = useState({
    asset_id: '',
    shift: '',
    date_from: '',
    date_to: '',
  });

  const fetchAssets = async () => {
    try {
      const res = await client.get('/assets');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Assets error:', err);
      return [];
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await client.get('/pm/shifts');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Shifts error:', err);
      return [];
    }
  };

  const fetchLogs = async () => {
    try {
      const params = {};
      if (filters.asset_id) params.asset_id = filters.asset_id;
      if (filters.shift) params.shift = filters.shift;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await client.get('/utilities/machine-condition', { params });
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Machine condition logs error:', err);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [l, a, s] = await Promise.all([fetchLogs(), fetchAssets(), fetchShifts()]);
        setLogs(l);
        setAssets(a);
        setShifts(s);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const l = await fetchLogs();
        setLogs(l);
      } catch (err) {
        console.error('Failed to load filtered logs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [filters]);

  const handleDelete = async (id) => {
    if (!hasPermission('add_machine_condition')) {
      alert('You do not have permission to delete machine condition logs');
      return;
    }

    if (!confirm('Are you sure you want to delete this machine condition log?')) {
      return;
    }

    setDeleting(id);
    try {
      await client.delete(`/utilities/machine-condition/${id}`);
      setLogs((prev) => prev.filter((log) => log.id !== id));
      alert('Machine condition log deleted successfully');
    } catch (err) {
      console.error('Delete machine condition log error:', err);
      alert(err?.response?.data?.message || 'Failed to delete machine condition log');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading machine condition logs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Machine Condition Logs</h2>
        {hasPermission('add_machine_condition') && (
          <button
            onClick={() => navigate('/utilities/machine-condition/entry')}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
          >
            Add New Entry
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Asset</label>
            <select
              value={filters.asset_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, asset_id: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            >
              <option value="">All Assets</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_code} - {a.asset_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Shift</label>
            <select
              value={filters.shift}
              onChange={(e) => setFilters((prev) => ({ ...prev, shift: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            >
              <option value="">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.shift_id} value={s.shift_id}>
                  {s.shift_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-800 bg-slate-950">
            <tr>
              <th className="px-3 py-2 text-left text-slate-300">Date</th>
              <th className="px-3 py-2 text-left text-slate-300">Shift</th>
              <th className="px-3 py-2 text-left text-slate-300">Asset</th>
              <th className="px-3 py-2 text-left text-slate-300">Temp (°C)</th>
              <th className="px-3 py-2 text-left text-slate-300">Vibration</th>
              <th className="px-3 py-2 text-left text-slate-300">Noise (dB)</th>
              <th className="px-3 py-2 text-left text-slate-300">Pressure</th>
              <th className="px-3 py-2 text-left text-slate-300">Current</th>
              <th className="px-3 py-2 text-left text-slate-300">Voltage</th>
              <th className="px-3 py-2 text-left text-slate-300">Status</th>
              {hasPermission('add_machine_condition') && (
                <th className="px-3 py-2 text-left text-slate-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={hasPermission('add_machine_condition') ? 11 : 10}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  No machine condition logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-800 hover:bg-slate-800/50 ${
                    log.condition_alert ? 'bg-orange-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-slate-200">{formatDate(log.log_date)}</td>
                  <td className="px-3 py-2 text-slate-200">{log.shift || '-'}</td>
                  <td className="px-3 py-2 text-orange-400">{log.asset}</td>
                  <td className="px-3 py-2 text-slate-200">{log.temperature_c || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.vibration_mm_s || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.noise_db || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.pressure_bar || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.current_amp || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.voltage_v || '-'}</td>
                  <td className="px-3 py-2">
                    {log.condition_alert ? (
                      <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] text-white">
                        Alert
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] text-white">
                        OK
                      </span>
                    )}
                  </td>
                  {hasPermission('add_machine_condition') && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deleting === log.id}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleting === log.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MachineConditionLogs;
