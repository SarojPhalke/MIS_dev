import React, { useEffect, useState } from 'react';
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

const StatusBadge = ({ status, isOverdue }) => {
  const statusColors = {
    scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-300 border-green-500/30',
    overdue: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  const colorClass = statusColors[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  const displayStatus = isOverdue ? 'OVERDUE' : (status ? status.toUpperCase() : '-');

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

const PMSchedule = () => {
  const { hasPermission } = usePermissions();
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    pm_title: '',
    asset_id: '',
    frequency_interval: '',
    pm_frequency_interval: '30 days',
    last_pm_date: '',
    checklist_ref: '',
    responsible_person: '',
  });

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

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([fetchSchedules(), fetchAssets()]);
      setSchedules(s);
      setAssets(a);
    } catch (err) {
      console.error('PM load error:', err);
      alert(err?.response?.data?.message || 'Failed to load PM schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const openAddModal = () => {
    setEditMode(false);
    setSelectedSchedule(null);
    setFormData({
      pm_title: '',
      asset_id: '',
      frequency_interval: '',
      pm_frequency_interval: '30 days',
      last_pm_date: '',
      checklist_ref: '',
      responsible_person: '',
    });
    setShowModal(true);
  };

  const openEditModal = (schedule) => {
    setEditMode(true);
    setSelectedSchedule(schedule);
    setFormData({
      pm_title: schedule.pm_title || '',
      asset_id: schedule.asset_id || '',
      frequency_interval: schedule.frequency_interval || '',
      pm_frequency_interval: schedule.pm_frequency_interval || '30 days',
      last_pm_date: toDateInputValue(schedule.last_pm_date),
      checklist_ref: schedule.checklist_ref || '',
      responsible_person: schedule.responsible_person || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setSelectedSchedule(null);
  };

  const onChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        asset_id: formData.asset_id || null,
        frequency_interval: formData.frequency_interval || formData.pm_frequency_interval,
        last_pm_date: formData.last_pm_date || null,
        checklist_ref: formData.checklist_ref || null,
        responsible_person: formData.responsible_person || null,
      };

      if (!editMode) {
        await client.post('/pm/schedule', payload);
      } else {
        await client.put(`/pm/schedule/${selectedSchedule.id}`, payload);
      }

      setShowModal(false);
      await refreshAll();
    } catch (err) {
      console.error('Save PM schedule error:', err);
      alert(err?.response?.data?.message || 'Failed to save PM schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this PM schedule?')) return;

    try {
      await client.delete(`/pm/schedule/${scheduleId}`);
      await refreshAll();
    } catch (err) {
      console.error('Delete PM schedule error:', err);
      alert(err?.response?.data?.message || 'Failed to delete PM schedule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">PM Schedule Management</h2>
          <p className="text-sm text-slate-400">
            Create and manage preventive maintenance schedules for assets.
          </p>
        </div>
        {hasPermission('create_pm_schedule') && (
          <button
            type="button"
            onClick={openAddModal}
            className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
          >
            Add PM Schedule
          </button>
        )}
      </div>

      {/* Table */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">PM Schedules</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-md border border-slate-800 bg-slate-900 md:block shadow-sm">
              <table className="min-w-[1200px] w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">PM Title</th>
                    <th className="px-3 py-2">Asset</th>
                    <th className="px-3 py-2">Frequency</th>
                    <th className="px-3 py-2">Last PM</th>
                    <th className="px-3 py-2">Next PM</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Responsible</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className={`border-t border-slate-800 hover:bg-slate-800/50 ${
                        schedule.is_overdue ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2">{schedule.pm_title}</td>
                      <td className="px-3 py-2">
                        {schedule.asset_code || schedule.asset_name || '-'}
                      </td>
                      <td className="px-3 py-2">{schedule.pm_frequency_interval || '-'}</td>
                      <td className="px-3 py-2">{toDateInputValue(schedule.last_pm_date) || '-'}</td>
                      <td className="px-3 py-2">{toDateInputValue(schedule.next_pm_date) || '-'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={schedule.status} isOverdue={schedule.is_overdue} />
                      </td>
                      <td className="px-3 py-2">
                        {schedule.responsible_person_name || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          {hasPermission('update_pm_schedule') && (
                            <button
                              type="button"
                              onClick={() => openEditModal(schedule)}
                              className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission('delete_pm_schedule') && (
                            <button
                              type="button"
                              onClick={() => handleDelete(schedule.id)}
                              className="rounded-md border border-red-600 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!schedules.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-3 text-center text-xs text-slate-400">
                        No PM schedules found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="space-y-2 md:hidden">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`rounded-md border border-slate-800 bg-slate-900 p-3 shadow-sm ${
                    schedule.is_overdue ? 'border-red-500/30 bg-red-500/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {schedule.pm_title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {schedule.asset_code || schedule.asset_name || 'Unknown Asset'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-300">
                        Next: {toDateInputValue(schedule.next_pm_date) || '-'}
                      </p>
                    </div>
                    <StatusBadge status={schedule.status} isOverdue={schedule.is_overdue} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    {hasPermission('update_pm_schedule') && (
                      <button
                        type="button"
                        onClick={() => openEditModal(schedule)}
                        className="flex-1 rounded-md border border-slate-600 px-2 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission('delete_pm_schedule') && (
                      <button
                        type="button"
                        onClick={() => handleDelete(schedule.id)}
                        className="flex-1 rounded-md border border-red-600 px-2 py-2 text-[11px] text-red-300 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!schedules.length && (
                <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-400">
                  No PM schedules found.
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editMode ? 'Edit PM Schedule' : 'Add PM Schedule'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">PM Title *</label>
                <input
                  value={formData.pm_title}
                  onChange={onChange('pm_title')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Asset *</label>
                <select
                  value={formData.asset_id}
                  onChange={onChange('asset_id')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="">Select Asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_code} - {asset.asset_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Frequency Interval *
                </label>
                <select
                  value={formData.pm_frequency_interval}
                  onChange={onChange('pm_frequency_interval')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="7 days">Weekly (7 days)</option>
                  <option value="14 days">Bi-weekly (14 days)</option>
                  <option value="30 days">Monthly (30 days)</option>
                  <option value="60 days">Bi-monthly (60 days)</option>
                  <option value="90 days">Quarterly (90 days)</option>
                  <option value="180 days">Semi-annual (180 days)</option>
                  <option value="365 days">Annual (365 days)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Last PM Date</label>
                <input
                  type="date"
                  value={formData.last_pm_date}
                  onChange={onChange('last_pm_date')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Checklist Ref</label>
                <input
                  value={formData.checklist_ref}
                  onChange={onChange('checklist_ref')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Responsible Person
                </label>
                <input
                  value={formData.responsible_person}
                  onChange={onChange('responsible_person')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                  placeholder="User ID (UUID)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
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
                {saving ? 'Saving...' : editMode ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PMSchedule;
