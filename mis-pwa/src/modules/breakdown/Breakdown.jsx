import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

const Modal = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const statusColors = {
    open: 'bg-red-500/20 text-red-300 border-red-500/30',
    ack: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
    closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };

  const colorClass = statusColors[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  const displayStatus = status ? status.replace('_', ' ').toUpperCase() : '-';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium ${colorClass}`}>
      {displayStatus}
    </span>
  );
};

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

const toTimeInputValue = (value) => {
  if (!value) return '';
  try {
    if (typeof value === 'string' && value.includes(':')) {
      return value.slice(0, 5); // HH:MM format
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
};

const Breakdown = () => {
  const { hasPermission } = usePermissions();
  const [breakdowns, setBreakdowns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [saving, setSaving] = useState(false);

  const [assetOptions, setAssetOptions] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [responsiblePeople, setResponsiblePeople] = useState([]);
  const [responsiblePeopleLoading, setResponsiblePeopleLoading] = useState(false);

  const [addFormData, setAddFormData] = useState({
    bd_code: '',
    shift_id: '',
    entry_date: '',
    entry_time: '',
    asset_code: '',
    bd_status: 'open',
    asset_location: '',
    bu_name: '',
    operator_name: '',
    key_issue: '',
    nature_of_complaint: '',
    note: '',
  });

  const [memoFormData, setMemoFormData] = useState({
    action_taken: '',
    engineer_findings: '',
    job_start: '',
    job_completion_date: '',
    spare_usage_id: '',
  });

  const [statusFormData, setStatusFormData] = useState({
    bd_status: 'open',
    responsible_person: '',
  });

  const fetchAssetOptions = async () => {
    setAssetsLoading(true);
    try {
      // Reuse existing assets endpoint; it reads from `asset_master`.
      const res = await client.get('/assets');
      const list = res.data?.data ?? res.data;
      const codes = Array.isArray(list)
        ? list.map((a) => a.asset_code).filter(Boolean)
        : [];
      setAssetOptions(codes);
    } catch (err) {
      console.error('Asset options load error:', err);
      setAssetOptions([]);
      alert(err?.response?.data?.message || 'Failed to load asset codes');
    } finally {
      setAssetsLoading(false);
    }
  };

  const ensureAssetOptionsLoaded = () => {
    if (assetOptions.length || assetsLoading) return;
    fetchAssetOptions();
  };

  const fetchResponsiblePeople = async () => {
    setResponsiblePeopleLoading(true);
    try {
      const res = await client.get('/breakdowns/responsible-people');
      const list = res.data?.data ?? res.data;
      const people = Array.isArray(list) ? list : [];
      setResponsiblePeople(people);
    } catch (err) {
      console.error('Responsible people load error:', err);
      setResponsiblePeople([]);
      alert(err?.response?.data?.message || 'Failed to load responsible people');
    } finally {
      setResponsiblePeopleLoading(false);
    }
  };

  const ensureResponsiblePeopleLoaded = () => {
    if (responsiblePeople.length || responsiblePeopleLoading) return;
    fetchResponsiblePeople();
  };

  const fetchStats = async () => {
    const res = await client.get('/breakdowns/stats');
    return res.data?.data ?? res.data;
  };

  const fetchBreakdowns = async ({ status }) => {
    const params = {};
    if (status && status !== 'all') params.status = status;

    const res = await client.get('/breakdowns', { params });
    const list = res.data?.data ?? res.data;
    return Array.isArray(list) ? list : [];
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        fetchStats(),
        fetchBreakdowns({ status: statusFilter })
      ]);
      setStats(s);
      setBreakdowns(b);
    } catch (err) {
      console.error('Breakdowns load error:', err);
      alert(err?.response?.data?.message || 'Failed to load breakdowns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const b = await fetchBreakdowns({ status: statusFilter });
        setBreakdowns(b);
      } catch (err) {
        console.error('Breakdowns filter error:', err);
        alert(err?.response?.data?.message || 'Failed to load filtered breakdowns');
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openAddModal = () => {
    ensureAssetOptionsLoaded();
    setAddFormData({
      bd_code: '',
      shift_id: '',
      entry_date: new Date().toISOString().slice(0, 10),
      entry_time: new Date().toTimeString().slice(0, 5),
      asset_code: '',
      bd_status: 'open',
      asset_location: '',
      bu_name: '',
      operator_name: '',
      key_issue: '',
      nature_of_complaint: '',
      note: '',
    });
    setShowAddModal(true);
  };

  const openMemoModal = (breakdown) => {
    if (!breakdown?.bd_id) {
      alert('Cannot edit memo: missing breakdown id.');
      return;
    }

    setSelectedBreakdown(breakdown);
    setMemoFormData({
      action_taken: breakdown.action_taken || '',
      engineer_findings: breakdown.engineer_findings || '',
      job_start: toDateInputValue(breakdown.job_start),
      job_completion_date: toDateInputValue(breakdown.job_completion_date),
      spare_usage_id: breakdown.spare_usage_id || '',
    });
    setShowMemoModal(true);
  };

  const openStatusModal = (breakdown) => {
    if (!breakdown?.bd_id) {
      alert('Cannot update status: missing breakdown id.');
      return;
    }

    ensureResponsiblePeopleLoaded();
    setSelectedBreakdown(breakdown);
    setStatusFormData({
      bd_status: breakdown.bd_status || 'open',
      responsible_person: breakdown.responsible_person || '',
    });
    setShowStatusModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowAddModal(false);
  };

  const closeMemoModal = () => {
    if (saving) return;
    setShowMemoModal(false);
    setSelectedBreakdown(null);
  };

  const closeStatusModal = () => {
    if (saving) return;
    setShowStatusModal(false);
    setSelectedBreakdown(null);
  };

  const onChange = (key) => (e) => {
    setAddFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onMemoChange = (key) => (e) => {
    setMemoFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onStatusChange = (key) => (e) => {
    setStatusFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...addFormData,
        shift_id: addFormData.shift_id || null,
        asset_location: addFormData.asset_location || null,
        bu_name: addFormData.bu_name || null,
        operator_name: addFormData.operator_name || null,
        key_issue: addFormData.key_issue || null,
        nature_of_complaint: addFormData.nature_of_complaint || null,
        note: addFormData.note || null,
      };

      await client.post('/breakdowns', payload);

      setShowAddModal(false);
      await refreshAll();
    } catch (err) {
      console.error('Create breakdown error:', err);
      alert(err?.response?.data?.message || 'Failed to create breakdown');
    } finally {
      setSaving(false);
    }
  };

  const handleMemoSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...memoFormData,
        job_start: memoFormData.job_start || null,
        job_completion_date: memoFormData.job_completion_date || null,
        spare_usage_id: memoFormData.spare_usage_id || null,
      };

      await client.put(`/breakdowns/${selectedBreakdown.bd_id}/memo`, payload);

      setShowMemoModal(false);
      await refreshAll();
    } catch (err) {
      console.error('Update memo error:', err);
      alert(err?.response?.data?.message || 'Failed to update breakdown memo');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...statusFormData,
        responsible_person: statusFormData.responsible_person || null,
      };

      await client.put(`/breakdowns/${selectedBreakdown.bd_id}/status`, payload);

      setShowStatusModal(false);
      await refreshAll();
    } catch (err) {
      console.error('Update status error:', err);
      alert(err?.response?.data?.message || 'Failed to update breakdown status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Breakdown Maintenance</h2>
          <p className="text-sm text-slate-400">
            Track and manage equipment breakdowns with status updates and engineer memos.
          </p>
        </div>
        {hasPermission('add_bd') && (
          <button
            type="button"
            onClick={openAddModal}
            className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
          >
            Add Breakdown
          </button>
        )}
      </div>

      {/* Stats */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Breakdown Stats</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Total</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.total ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Open</p>
            <p className="mt-1 text-xl font-semibold text-red-300">{stats?.open ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Acknowledged</p>
            <p className="mt-1 text-xl font-semibold text-orange-300">{stats?.ack ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">In Progress</p>
            <p className="mt-1 text-xl font-semibold text-blue-300">{stats?.in_progress ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Resolved</p>
            <p className="mt-1 text-xl font-semibold text-green-300">{stats?.resolved ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-400">Closed</p>
            <p className="mt-1 text-xl font-semibold text-gray-300">{stats?.closed ?? 0}</p>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-end">
        <div className="w-full md:w-64">
          <label className="mb-1 block text-xs font-medium text-slate-300">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="ack">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Breakdowns</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <>
            {/* Mobile-first: cards */}
            <div className="space-y-2 md:hidden">
              {breakdowns.map((bd) => {
                const canEditMemo = !!bd.bd_id && hasPermission('update_bd_memo');
                const canEditStatus = !!bd.bd_id && hasPermission('update_bd_status');
                return (
                  <div
                    key={bd.bd_id || bd.bd_code}
                    className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {bd.bd_code}
                        </p>
                        <p className="text-xs text-slate-400">{bd.asset_code || '-'}</p>
                      </div>
                      <StatusBadge status={bd.bd_status} />
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <p className="text-[10px] text-slate-400">Date</p>
                        <p className="truncate">{toDateInputValue(bd.entry_date) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Time</p>
                        <p className="truncate">{toTimeInputValue(bd.entry_time) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Operator</p>
                        <p className="truncate">{bd.operator_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Key Issue</p>
                        <p className="truncate">{bd.key_issue || '-'}</p>
                      </div>
                    </div>

                    {(canEditMemo || canEditStatus) && (
                      <div className="mt-3 flex gap-2">
                        {canEditMemo && (
                          <button
                            type="button"
                            onClick={() => openMemoModal(bd)}
                            className="flex-1 rounded-md border border-slate-600 px-2 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            BD Memo
                          </button>
                        )}
                        {canEditStatus && (
                          <button
                            type="button"
                            onClick={() => openStatusModal(bd)}
                            className="flex-1 rounded-md border border-slate-600 px-2 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            Update Status
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!breakdowns.length && (
                <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-400">
                  No breakdowns found.
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-md border border-slate-800 bg-slate-900 md:block shadow-sm">
              <table className="min-w-[1200px] w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">BD Code</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Asset Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Operator</th>
                    <th className="px-3 py-2">Key Issue</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdowns.map((bd) => {
                    const canEditMemo = !!bd.bd_id && hasPermission('update_bd_memo');
                    const canEditStatus = !!bd.bd_id && hasPermission('update_bd_status');
                    return (
                      <tr key={bd.bd_id || bd.bd_code} className="border-t border-slate-800 hover:bg-slate-800/50">
                        <td className="px-3 py-2">{bd.bd_code}</td>
                        <td className="px-3 py-2">{toDateInputValue(bd.entry_date) || '-'}</td>
                        <td className="px-3 py-2">{toTimeInputValue(bd.entry_time) || '-'}</td>
                        <td className="px-3 py-2">{bd.asset_code || '-'}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={bd.bd_status} />
                        </td>
                        <td className="px-3 py-2">{bd.operator_name || '-'}</td>
                        <td className="px-3 py-2">{bd.key_issue || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            {canEditMemo && (
                              <button
                                type="button"
                                onClick={() => openMemoModal(bd)}
                                className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                              >
                                BD Memo
                              </button>
                            )}
                            {canEditStatus && (
                              <button
                                type="button"
                                onClick={() => openStatusModal(bd)}
                                className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                              >
                                Update Status
                              </button>
                            )}
                            {!canEditMemo && !canEditStatus && (
                              <span className="text-[11px] text-slate-500">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!breakdowns.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-3 text-center text-xs text-slate-400">
                        No breakdowns found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Add Breakdown Modal */}
      {showAddModal && (
        <Modal title="Add New Breakdown" onClose={closeAddModal}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">BD Code *</label>
                <input
                  value={addFormData.bd_code}
                  onChange={onChange('bd_code')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Shift ID</label>
                <input
                  value={addFormData.shift_id}
                  onChange={onChange('shift_id')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Entry Date *</label>
                <input
                  type="date"
                  value={addFormData.entry_date}
                  onChange={onChange('entry_date')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Entry Time *</label>
                <input
                  type="time"
                  value={addFormData.entry_time}
                  onChange={onChange('entry_time')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Asset Code *</label>
                <select
                  value={addFormData.asset_code}
                  onChange={onChange('asset_code')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    {assetsLoading ? 'Loading assets...' : 'Select asset code'}
                  </option>
                  {assetOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">BD Status *</label>
                <select
                  value={addFormData.bd_status}
                  onChange={onChange('bd_status')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="ack">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Asset Location</label>
                <input
                  value={addFormData.asset_location}
                  onChange={onChange('asset_location')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">BU Name</label>
                <input
                  value={addFormData.bu_name}
                  onChange={onChange('bu_name')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Operator Name</label>
                <input
                  value={addFormData.operator_name}
                  onChange={onChange('operator_name')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Key Issue</label>
                <input
                  value={addFormData.key_issue}
                  onChange={onChange('key_issue')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Nature of Complaint</label>
                <textarea
                  value={addFormData.nature_of_complaint}
                  onChange={onChange('nature_of_complaint')}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Note</label>
                <textarea
                  value={addFormData.note}
                  onChange={onChange('note')}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Create Breakdown'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* BD Memo Modal */}
      {showMemoModal && (
        <Modal title="BD Memo" onClose={closeMemoModal}>
          <form onSubmit={handleMemoSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Action Taken</label>
                <textarea
                  value={memoFormData.action_taken}
                  onChange={onMemoChange('action_taken')}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Engineer Findings</label>
                <textarea
                  value={memoFormData.engineer_findings}
                  onChange={onMemoChange('engineer_findings')}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Job Start</label>
                <input
                  type="date"
                  value={memoFormData.job_start}
                  onChange={onMemoChange('job_start')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Job Completion Date</label>
                <input
                  type="date"
                  value={memoFormData.job_completion_date}
                  onChange={onMemoChange('job_completion_date')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Spare Usage ID</label>
                <input
                  value={memoFormData.spare_usage_id}
                  onChange={onMemoChange('spare_usage_id')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMemoModal}
                disabled={saving}
                className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Update Memo'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <Modal title="Update Breakdown Status" onClose={closeStatusModal}>
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">BD Status *</label>
                <select
                  value={statusFormData.bd_status}
                  onChange={onStatusChange('bd_status')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="ack">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Responsible Person</label>
                <select
                  value={statusFormData.responsible_person}
                  onChange={onStatusChange('responsible_person')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    {responsiblePeopleLoading ? 'Loading users...' : 'Select responsible person'}
                  </option>

                  {/* If current value isn't in the loaded list yet, show the raw id to avoid blank selection */}
                  {statusFormData.responsible_person &&
                    !responsiblePeople.some((p) => p.id === statusFormData.responsible_person) && (
                      <option value={statusFormData.responsible_person}>
                        {statusFormData.responsible_person}
                      </option>
                    )}

                  {(responsiblePeople || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusModal}
                disabled={saving}
                className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Breakdown;
