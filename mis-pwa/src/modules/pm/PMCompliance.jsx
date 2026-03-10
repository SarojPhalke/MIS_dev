import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

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

const PMCompliance = () => {
  const { hasPermission } = usePermissions();
  const [compliance, setCompliance] = useState([]);
  const [assets, setAssets] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compliancePercentage, setCompliancePercentage] = useState(0);

  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const [buFilter, setBuFilter] = useState('');

  const fetchCompliance = async ({ start_date, end_date, asset_id, bu_name } = {}) => {
    const params = {};
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;
    if (asset_id && asset_id !== 'all') params.asset_id = asset_id;
    if (bu_name) params.bu_name = bu_name;

    try {
      const res = await client.get('/pm/compliance', { params });
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('PM compliance error:', err);
      return [];
    }
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

  const fetchStats = async () => {
    try {
      const res = await client.get('/pm/stats');
      return res.data?.data ?? res.data;
    } catch (err) {
      console.error('PM stats error:', err);
      return null;
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [c, a, s, stats] = await Promise.all([
        fetchCompliance({
          start_date: startDateFilter,
          end_date: endDateFilter,
          asset_id: assetFilter,
          bu_name: buFilter,
        }),
        fetchAssets(),
        fetchShifts(),
        fetchStats(),
      ]);
      setCompliance(c);
      setAssets(a);
      setShifts(s);
      if (stats) {
        setCompliancePercentage(stats.compliance_percentage || 0);
      }
    } catch (err) {
      console.error('PM load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [startDateFilter, endDateFilter, assetFilter, buFilter]);

  const handleFilterChange = () => {
    refreshAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">PM Compliance</h2>
          <p className="text-sm text-slate-400">
            View preventive maintenance compliance reports and history.
          </p>
        </div>
      </div>

      {/* Compliance Percentage */}
      <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Overall Compliance Rate</p>
            <p className="mt-1 text-3xl font-bold text-slate-100">
              {compliancePercentage}%
            </p>
          </div>
          <div className="h-16 w-16 rounded-full border-4 border-slate-700 border-t-accent" />
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-end">
        <div className="w-full md:w-48">
          <label className="mb-1 block text-xs font-medium text-slate-300">Start Date</label>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="mb-1 block text-xs font-medium text-slate-300">End Date</label>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="mb-1 block text-xs font-medium text-slate-300">Asset</label>
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          >
            <option value="all">All Assets</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.asset_code}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="mb-1 block text-xs font-medium text-slate-300">BU Name</label>
          <input
            value={buFilter}
            onChange={(e) => setBuFilter(e.target.value)}
            placeholder="Filter by BU"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="w-full md:w-auto">
          <button
            type="button"
            onClick={handleFilterChange}
            className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 md:w-auto"
          >
            Apply Filters
          </button>
        </div>
      </section>

      {/* Table */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Compliance Records</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-md border border-slate-800 bg-slate-900 md:block shadow-sm">
              <table className="min-w-[1200px] w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">PM Title</th>
                    <th className="px-3 py-2">PM Code</th>
                    <th className="px-3 py-2">Asset</th>
                    <th className="px-3 py-2">PM Date</th>
                    <th className="px-3 py-2">Shift</th>
                    <th className="px-3 py-2">Remarks</th>
                    <th className="px-3 py-2">Responsible Person</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.map((record) => (
                    <tr
                      key={record.id}
                      className="border-t border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="px-3 py-2">{record.pm_title || '-'}</td>
                      <td className="px-3 py-2">{record.pm_code}</td>
                      <td className="px-3 py-2">
                        {record.asset_code || record.asset_name || '-'}
                      </td>
                      <td className="px-3 py-2">{toDateInputValue(record.pm_date) || '-'}</td>
                      <td className="px-3 py-2">{record.shift_id || '-'}</td>
                      <td className="px-3 py-2">{record.remarks || '-'}</td>
                      <td className="px-3 py-2">
                        {record.responsible_person_name || '-'}
                      </td>
                    </tr>
                  ))}
                  {!compliance.length && (
                    <tr>
                      <td colSpan={7} className="px-3 py-3 text-center text-xs text-slate-400">
                        No compliance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="space-y-2 md:hidden">
              {compliance.map((record) => (
                <div
                  key={record.id}
                  className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {record.pm_title || record.pm_code}
                      </p>
                      <p className="text-xs text-slate-400">
                        {record.asset_code || record.asset_name || 'Unknown Asset'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-300">
                        Date: {toDateInputValue(record.pm_date) || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-300">
                    <p className="text-[10px] text-slate-400">Remarks</p>
                    <p className="truncate">{record.remarks || '-'}</p>
                  </div>
                </div>
              ))}
              {!compliance.length && (
                <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-400">
                  No compliance records found.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default PMCompliance;
