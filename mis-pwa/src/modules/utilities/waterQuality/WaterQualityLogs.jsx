import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const WaterQualityLogs = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [filters, setFilters] = useState({
    sample_point: '',
    location_id: '',
    date_from: '',
    date_to: '',
  });

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
      if (filters.sample_point) params.sample_point = filters.sample_point;
      if (filters.location_id) params.location_id = filters.location_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await client.get('/utilities/water-quality', { params });
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Water quality logs error:', err);
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
    if (!hasPermission('add_water_quality')) {
      alert('You do not have permission to delete water quality logs');
      return;
    }

    if (!confirm('Are you sure you want to delete this water quality log?')) {
      return;
    }

    setDeleting(id);
    try {
      await client.delete(`/utilities/water-quality/${id}`);
      setLogs((prev) => prev.filter((log) => log.id !== id));
      alert('Water quality log deleted successfully');
    } catch (err) {
      console.error('Delete water quality log error:', err);
      alert(err?.response?.data?.message || 'Failed to delete water quality log');
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
        Loading water quality logs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Water Quality Logs</h2>
        {hasPermission('add_water_quality') && (
          <button
            onClick={() => navigate('/utilities/water-quality/entry')}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Add New Entry
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Sample Point
            </label>
            <input
              type="text"
              value={filters.sample_point}
              onChange={(e) => setFilters((prev) => ({ ...prev, sample_point: e.target.value }))}
              placeholder="Search sample point..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
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
              <th className="px-3 py-2 text-left text-slate-300">Sample Point</th>
              <th className="px-3 py-2 text-left text-slate-300">pH</th>
              <th className="px-3 py-2 text-left text-slate-300">TDS</th>
              <th className="px-3 py-2 text-left text-slate-300">Hardness</th>
              <th className="px-3 py-2 text-left text-slate-300">Temp</th>
              <th className="px-3 py-2 text-left text-slate-300">COD</th>
              <th className="px-3 py-2 text-left text-slate-300">BOD</th>
              <th className="px-3 py-2 text-left text-slate-300">Location</th>
              <th className="px-3 py-2 text-left text-slate-300">Status</th>
              {hasPermission('add_water_quality') && (
                <th className="px-3 py-2 text-left text-slate-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={hasPermission('add_water_quality') ? 11 : 10}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  No water quality logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-800 hover:bg-slate-800/50 ${
                    log.has_alert ? 'bg-red-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-slate-200">{formatDate(log.record_date)}</td>
                  <td className="px-3 py-2 text-blue-400">{log.sample_point}</td>
                  <td className="px-3 py-2 text-slate-200">{log.ph || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.tds_mg_l || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.hardness_mg_l || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.temperature_c || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.cod_mg_l || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.bod_mg_l || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{log.location}</td>
                  <td className="px-3 py-2">
                    {log.has_alert ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">
                        Alert
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] text-white">
                        OK
                      </span>
                    )}
                  </td>
                  {hasPermission('add_water_quality') && (
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

export default WaterQualityLogs;
