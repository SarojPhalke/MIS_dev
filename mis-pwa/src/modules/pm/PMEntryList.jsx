import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    open: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    ack: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    resolved: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    closed: 'bg-green-500/20 text-green-300 border-green-500/30',
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
      return value.slice(0, 5);
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
};

const PMEntryList = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [assets, setAssets] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');

  const [editFormData, setEditFormData] = useState({
    shift_id: '',
    entry_date: '',
    entry_time: '',
    operator_name: '',
    key_issue: '',
    nature_of_activity: '',
    note: '',
    pm_status: '',
  });

  const fetchEntries = async ({ status, asset_id, shift_id } = {}) => {
    const params = {};
    if (status && status !== 'all') params.status = status;
    if (asset_id && asset_id !== 'all') params.asset_id = asset_id;
    if (shift_id && shift_id !== 'all') params.shift_id = shift_id;

    try {
      const res = await client.get('/pm/entry', { params });
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('PM entries error:', err);
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

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [e, a, s] = await Promise.all([
        fetchEntries({
          status: statusFilter,
          asset_id: assetFilter,
          shift_id: shiftFilter,
        }),
        fetchAssets(),
        fetchShifts(),
      ]);
      setEntries(e);
      setAssets(a);
      setShifts(s);
    } catch (err) {
      console.error('PM load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [statusFilter, assetFilter, shiftFilter]);

  // Debug: Check permissions and entry data
  useEffect(() => {
    const hasStatusPerm = hasPermission('update_pm_status');
    console.log('🔍 PM Entry List Debug:', {
      hasUpdatePmStatusPermission: hasStatusPerm,
      entriesCount: entries.length,
      firstEntry: entries[0] ? { pm_id: entries[0].pm_id, pm_status: entries[0].pm_status } : null,
    });
  }, [entries, hasPermission]);

  const handleRowClick = (entry) => {
    if (entry.pm_id && hasPermission('create_pm_engineer')) {
      navigate(`/preventive/engineer/${entry.pm_id}`);
    }
  };

  const openEditModal = (entry) => {
    if (!entry.pm_id) {
      alert('Cannot edit: missing PM entry id.');
      return;
    }
    setSelectedEntry(entry);
    setEditFormData({
      shift_id: entry.shift_id || '',
      entry_date: toDateInputValue(entry.entry_date),
      entry_time: toTimeInputValue(entry.entry_time),
      operator_name: entry.operator_name || '',
      key_issue: entry.key_issue || '',
      nature_of_activity: entry.nature_of_activity || '',
      note: entry.note || '',
      pm_status: entry.pm_status || 'open',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setShowEditModal(false);
    setSelectedEntry(null);
  };

  const onEditChange = (key) => (e) => {
    setEditFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editFormData,
        shift_id: editFormData.shift_id || null,
        operator_name: editFormData.operator_name || null,
        key_issue: editFormData.key_issue || null,
        nature_of_activity: editFormData.nature_of_activity || null,
        note: editFormData.note || null,
        pm_status: editFormData.pm_status || null,
      };

      await client.put(`/pm/entry/${selectedEntry.pm_id}`, payload);

      setShowEditModal(false);
      await refreshAll();
    } catch (err) {
      console.error('Update PM entry error:', err);
      alert(err?.response?.data?.message || 'Failed to update PM entry');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (entryId, newStatus) => {
    if (!newStatus || !entryId) {
      console.warn('handleStatusChange: Missing entryId or newStatus', { entryId, newStatus });
      return;
    }

    setUpdatingStatus(entryId);
    try {
      await client.patch(`/pm/entry/${entryId}/status`, { status: newStatus });
      await refreshAll();
    } catch (err) {
      console.error('Update PM status error:', err);
      alert(err?.response?.data?.message || 'Failed to update PM status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Debug: Log permission status
  useEffect(() => {
    console.log('PM Entry List - update_pm_status permission:', hasPermission('update_pm_status'));
    console.log('PM Entry List - entries count:', entries.length);
    if (entries.length > 0) {
      console.log('PM Entry List - first entry:', {
        pm_id: entries[0].pm_id,
        pm_status: entries[0].pm_status,
      });
    }
  }, [entries, hasPermission]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Ongoing PM Entries</h2>
          <p className="text-sm text-slate-400">
            View all preventive maintenance entries from pm_entry_view.
          </p>
        </div>
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

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-end">
        <div className="w-full md:w-48">
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
          <label className="mb-1 block text-xs font-medium text-slate-300">Shift</label>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          >
            <option value="all">All Shifts</option>
            {shifts.map((shift) => (
              <option key={shift.shift_id} value={shift.shift_id}>
                Shift {shift.shift_id}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">PM Entries</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-md border border-slate-800 bg-slate-900 md:block shadow-sm">
              <table className="min-w-[1400px] w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">PM Code</th>
                    <th className="px-3 py-2">Asset Code</th>
                    <th className="px-3 py-2">Shift</th>
                    <th className="px-3 py-2">Entry Date</th>
                    <th className="px-3 py-2">Operator</th>
                    <th className="px-3 py-2">Key Issue</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action Taken</th>
                    <th className="px-3 py-2">Findings</th>
                    <th className="px-3 py-2">Job Start</th>
                    <th className="px-3 py-2">Completion</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.pm_id || entry.pm_code}
                      className="border-t border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="px-3 py-2">{entry.pm_code}</td>
                      <td className="px-3 py-2">{entry.asset_code || '-'}</td>
                      <td className="px-3 py-2">{entry.shift_id || '-'}</td>
                      <td className="px-3 py-2">{toDateInputValue(entry.entry_date) || '-'}</td>
                      <td className="px-3 py-2">{entry.operator_name || '-'}</td>
                      <td className="px-3 py-2">{entry.key_issue || '-'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={entry.pm_status} />
                      </td>
                      <td className="px-3 py-2">{entry.action_taken || '-'}</td>
                      <td className="px-3 py-2">{entry.engineer_findings || '-'}</td>
                      <td className="px-3 py-2">{toDateInputValue(entry.job_start) || '-'}</td>
                      <td className="px-3 py-2">
                        {toDateInputValue(entry.job_completion_date) || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {hasPermission('update_pm_entry') && entry.pm_id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(entry);
                              }}
                              className="whitespace-nowrap rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                          {entry.pm_id && hasPermission('create_pm_engineer') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/preventive/engineer/${entry.pm_id}`);
                              }}
                              className="whitespace-nowrap rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Engineer
                            </button>
                          )}
                          {hasPermission('update_pm_status') && entry.pm_id && (
                            <select
                              value={entry.pm_status || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(entry.pm_id, e.target.value);
                              }}
                              disabled={updatingStatus === entry.pm_id}
                              className="min-w-[90px] rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-100 focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              title="Change Status"
                            >
                              <option value="open">Open</option>
                              <option value="ack">Ack</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!entries.length && (
                    <tr>
                      <td colSpan={12} className="px-3 py-3 text-center text-xs text-slate-400">
                        No PM entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="space-y-2 md:hidden">
              {entries.map((entry) => (
                <div
                  key={entry.pm_id || entry.pm_code}
                  className="rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {entry.pm_code}
                      </p>
                      <p className="text-xs text-slate-400">{entry.asset_code || '-'}</p>
                    </div>
                    <StatusBadge status={entry.pm_status} />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      <p className="text-[10px] text-slate-400">Date</p>
                      <p className="truncate">{toDateInputValue(entry.entry_date) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Shift</p>
                      <p className="truncate">{entry.shift_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Operator</p>
                      <p className="truncate">{entry.operator_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Key Issue</p>
                      <p className="truncate">{entry.key_issue || '-'}</p>
                    </div>
                  </div>

                  {entry.action_taken && (
                    <div className="mt-2 text-[11px] text-slate-300">
                      <p className="text-[10px] text-slate-400">Action Taken</p>
                      <p className="truncate">{entry.action_taken}</p>
                    </div>
                  )}

                  {(hasPermission('update_pm_entry') ||
                    hasPermission('create_pm_engineer') ||
                    hasPermission('update_pm_status')) &&
                    entry.pm_id && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          {hasPermission('update_pm_entry') && (
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="flex-1 rounded-md border border-slate-600 px-2 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission('create_pm_engineer') && (
                            <button
                              type="button"
                              onClick={() => navigate(`/preventive/engineer/${entry.pm_id}`)}
                              className="flex-1 rounded-md border border-slate-600 px-2 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Engineer
                            </button>
                          )}
                        </div>
                        {hasPermission('update_pm_status') && (
                          <div className="w-full">
                            <label className="mb-1 block text-[10px] text-slate-400">Status</label>
                            <select
                              value={entry.pm_status || ''}
                              onChange={(e) => handleStatusChange(entry.pm_id, e.target.value)}
                              disabled={updatingStatus === entry.pm_id}
                              className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-[11px] text-slate-100 focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="open">Open</option>
                              <option value="ack">Acknowledged</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              ))}
              {!entries.length && (
                <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-400">
                  No PM entries found.
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Edit Modal */}
      {showEditModal && selectedEntry && (
        <Modal title="Edit PM Entry" onClose={closeEditModal}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Shift</label>
                <select
                  value={editFormData.shift_id}
                  onChange={onEditChange('shift_id')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="">Select Shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.shift_id} value={shift.shift_id}>
                      Shift {shift.shift_id} ({shift.shift_from} - {shift.shift_to})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">PM Status *</label>
                <select
                  value={editFormData.pm_status}
                  onChange={onEditChange('pm_status')}
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
                <label className="mb-1 block text-xs font-medium text-slate-300">Entry Date *</label>
                <input
                  type="date"
                  value={editFormData.entry_date}
                  onChange={onEditChange('entry_date')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Entry Time *</label>
                <input
                  type="time"
                  value={editFormData.entry_time}
                  onChange={onEditChange('entry_time')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Operator Name</label>
                <input
                  value={editFormData.operator_name}
                  onChange={onEditChange('operator_name')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Key Issue</label>
                <input
                  value={editFormData.key_issue}
                  onChange={onEditChange('key_issue')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Nature of Activity
                </label>
                <textarea
                  value={editFormData.nature_of_activity}
                  onChange={onEditChange('nature_of_activity')}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">Notes</label>
                <textarea
                  value={editFormData.note}
                  onChange={onEditChange('note')}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
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
                {saving ? 'Saving...' : 'Update Entry'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PMEntryList;
