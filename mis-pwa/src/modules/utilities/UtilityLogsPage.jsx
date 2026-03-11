import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

const UtilityLogsPage = () => {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [filters, setFilters] = useState({
    utility_type: '',
    location_id: '',
    date_from: '',
    date_to: '',
  });

  const utilityTypes = ['Power', 'Water', 'Air', 'Gas'];
  const utilityColors = {
    Power: 'text-yellow-400',
    Water: 'text-blue-400',
    Air: 'text-gray-400',
    Gas: 'text-orange-400',
  };

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

  const fetchLocations = async () => {
    try {
      const res = await client.get('/utilities/locations');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Locations error:', err);
      return [];
    }
  };

  const fetchLogs = async () => {
    try {
      const params = {};
      if (filters.utility_type) params.utility_type = filters.utility_type;
      if (filters.location_id) params.location_id = filters.location_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await client.get('/utilities', { params });
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Utility logs error:', err);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [l, loc] = await Promise.all([fetchLogs(), fetchLocations()]);
        setLogs(l);
        setLocations(loc);
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
    if (!hasPermission('add_utility_logs')) {
      alert('You do not have permission to delete utility logs');
      return;
    }

    if (!confirm('Are you sure you want to delete this utility log?')) {
      return;
    }

    setDeleting(id);
    try {
      await client.delete(`/utilities/${id}`);
      setLogs((prev) => prev.filter((log) => log.id !== id));
      alert('Utility log deleted successfully');
    } catch (err) {
      console.error('Delete utility log error:', err);
      alert(err?.response?.data?.message || 'Failed to delete utility log');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading utility logs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Utility Logs</h2>

      {/* Filters */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Utility Type
            </label>
            <select
              value={filters.utility_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, utility_type: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            >
              <option value="">All Types</option>
              {utilityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Location</label>
            <select
              value={filters.location_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, location_id: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name}
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
              <th className="px-3 py-2 text-left text-slate-300">Utility Type</th>
              <th className="px-3 py-2 text-left text-slate-300">Meter Point</th>
              <th className="px-3 py-2 text-left text-slate-300">Reading</th>
              <th className="px-3 py-2 text-left text-slate-300">Asset</th>
              <th className="px-3 py-2 text-left text-slate-300">Location</th>
              <th className="px-3 py-2 text-left text-slate-300">Recorded By</th>
              <th className="px-3 py-2 text-left text-slate-300">Remarks</th>
              {hasPermission('add_utility_logs') && (
                <th className="px-3 py-2 text-left text-slate-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={hasPermission('add_utility_logs') ? 9 : 8} className="px-3 py-4 text-center text-slate-400">
                  No utility logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-200">{formatDate(log.timestamp)}</td>
                  <td className="px-3 py-2">
                    <span className={utilityColors[log.utility_type] || 'text-slate-200'}>
                      {log.utility_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-200">{log.meter_point}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {log.reading_value} {log.reading_unit}
                  </td>
                  <td className="px-3 py-2 text-slate-200">{log.asset}</td>
                  <td className="px-3 py-2 text-slate-200">{log.location}</td>
                  <td className="px-3 py-2 text-slate-200">{log.recorded_by}</td>
                  <td className="px-3 py-2 text-slate-400">{log.remarks || '-'}</td>
                  {hasPermission('add_utility_logs') && (
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

export default UtilityLogsPage;
