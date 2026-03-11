import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const CarbonLogsPage = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [filters, setFilters] = useState({
    source_type: '',
    location_id: '',
    date_from: '',
    date_to: '',
  });

  const sourceTypes = ['Electricity', 'DG Sets', 'LPG Furnace', 'Fuel Consumption'];

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
      if (filters.source_type) params.source_type = filters.source_type;
      if (filters.location_id) params.location_id = filters.location_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await client.get('/utilities/carbon', { params });
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Carbon logs error:', err);
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
    if (!hasPermission('add_carbon_logs')) {
      alert('You do not have permission to delete carbon emission logs');
      return;
    }

    if (!confirm('Are you sure you want to delete this carbon emission log?')) {
      return;
    }

    setDeleting(id);
    try {
      await client.delete(`/utilities/carbon/${id}`);
      setLogs((prev) => prev.filter((log) => log.id !== id));
      alert('Carbon emission log deleted successfully');
    } catch (err) {
      console.error('Delete carbon log error:', err);
      alert(err?.response?.data?.message || 'Failed to delete carbon emission log');
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
        Loading carbon emission logs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Carbon Emission Logs</h2>
        {hasPermission('add_carbon_logs') && (
          <button
            onClick={() => navigate('/utilities/carbon/entry')}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Add New Entry
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Source Type</label>
            <select
              value={filters.source_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, source_type: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            >
              <option value="">All Types</option>
              {sourceTypes.map((type) => (
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
              <th className="px-3 py-2 text-left text-slate-300">Source Type</th>
              <th className="px-3 py-2 text-left text-slate-300">Energy (kWh)</th>
              <th className="px-3 py-2 text-left text-slate-300">Fuel (L)</th>
              <th className="px-3 py-2 text-left text-slate-300">CO2e (kg)</th>
              <th className="px-3 py-2 text-left text-slate-300">Scope</th>
              <th className="px-3 py-2 text-left text-slate-300">Asset</th>
              <th className="px-3 py-2 text-left text-slate-300">Location</th>
              <th className="px-3 py-2 text-left text-slate-300">Recorded By</th>
              {hasPermission('add_carbon_logs') && (
                <th className="px-3 py-2 text-left text-slate-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={hasPermission('add_carbon_logs') ? 10 : 9}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  No carbon emission logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-200">{formatDate(log.record_date)}</td>
                  <td className="px-3 py-2 text-red-400">{log.source_type}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {log.energy_consumed_kwh ? log.energy_consumed_kwh.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-200">
                    {log.fuel_consumed_litre ? log.fuel_consumed_litre.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 font-semibold text-red-400">
                    {log.co2e_kg ? log.co2e_kg.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-200">{log.scope_category || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.asset}</td>
                  <td className="px-3 py-2 text-slate-200">{log.location}</td>
                  <td className="px-3 py-2 text-slate-200">{log.recorded_by}</td>
                  {hasPermission('add_carbon_logs') && (
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

export default CarbonLogsPage;
