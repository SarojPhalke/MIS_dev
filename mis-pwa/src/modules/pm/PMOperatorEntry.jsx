import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

const PMOperatorEntry = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    asset_code: '',
    shift_id: '',
    entry_date: new Date().toISOString().slice(0, 10),
    entry_time: new Date().toTimeString().slice(0, 5),
    operator_name: '',
    key_issue: '',
    nature_of_activity: '',
    note: '',
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [a, s] = await Promise.all([fetchAssets(), fetchShifts()]);
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

  const onChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Find asset_id from asset_code
      const selectedAsset = assets.find((a) => a.asset_code === formData.asset_code);
      if (!selectedAsset) {
        alert('Please select a valid asset');
        setSaving(false);
        return;
      }

      const payload = {
        asset_id: selectedAsset.id,
        shift_id: formData.shift_id || null,
        entry_date: formData.entry_date,
        entry_time: formData.entry_time,
        operator_name: formData.operator_name || null,
        key_issue: formData.key_issue || null,
        nature_of_activity: formData.nature_of_activity || null,
        note: formData.note || null,
      };

      await client.post('/pm/entry', payload);

      alert('PM entry created successfully!');
      navigate('/preventive/entries');
    } catch (err) {
      console.error('Create PM entry error:', err);
      alert(err?.response?.data?.message || 'Failed to create PM entry');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('create_pm_entry')) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have permission to create PM entries.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Create PM Entry</h2>
          <p className="text-sm text-slate-400">
            Log a new preventive maintenance entry as an operator.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/preventive/entries')}
          className="w-full rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 sm:w-auto"
        >
          Back to List
        </button>
      </div>

      <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Asset Code *</label>
              <select
                value={formData.asset_code}
                onChange={onChange('asset_code')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.asset_code}>
                    {asset.asset_code} - {asset.asset_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Shift</label>
              <select
                value={formData.shift_id}
                onChange={onChange('shift_id')}
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
              <label className="mb-1 block text-xs font-medium text-slate-300">Entry Date *</label>
              <input
                type="date"
                value={formData.entry_date}
                onChange={onChange('entry_date')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Entry Time *</label>
              <input
                type="time"
                value={formData.entry_time}
                onChange={onChange('entry_time')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Operator Name</label>
              <input
                value={formData.operator_name}
                onChange={onChange('operator_name')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">Key Issue</label>
              <input
                value={formData.key_issue}
                onChange={onChange('key_issue')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Nature of Activity
              </label>
              <textarea
                value={formData.nature_of_activity}
                onChange={onChange('nature_of_activity')}
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">Notes</label>
              <textarea
                value={formData.note}
                onChange={onChange('note')}
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/preventive/entries')}
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
              {saving ? 'Creating...' : 'Create PM Entry'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default PMOperatorEntry;
