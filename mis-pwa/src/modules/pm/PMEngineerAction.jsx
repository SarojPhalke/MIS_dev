import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const PMEngineerAction = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { pm_operator_id } = useParams();
  const [operatorEntry, setOperatorEntry] = useState(null);
  const [engineerData, setEngineerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    action_taken: '',
    engineer_findings: '',
    job_start: '',
    job_completion_date: '',
    responsible_person: '',
    spare_usage_id: '',
  });

  const fetchOperatorEntry = async () => {
    try {
      const res = await client.get('/pm/entry');
      const list = res.data?.data ?? res.data;
      const entry = Array.isArray(list)
        ? list.find((e) => e.pm_id === pm_operator_id || e.id === pm_operator_id)
        : null;
      return entry;
    } catch (err) {
      console.error('PM entry error:', err);
      return null;
    }
  };

  const fetchEngineerData = async () => {
    try {
      const res = await client.get(`/pm/engineer/${pm_operator_id}`);
      return res.data?.data ?? res.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        return null; // No engineer data yet
      }
      console.error('PM engineer error:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [entry, engineer] = await Promise.all([
          fetchOperatorEntry(),
          fetchEngineerData(),
        ]);
        setOperatorEntry(entry);
        setEngineerData(engineer);

        if (engineer) {
          setFormData({
            action_taken: engineer.action_taken || '',
            engineer_findings: engineer.engineer_findings || '',
            job_start: toDateInputValue(engineer.job_start),
            job_completion_date: toDateInputValue(engineer.job_completion_date),
            responsible_person: engineer.responsible_person || '',
            spare_usage_id: engineer.spare_usage_id || '',
          });
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        alert('Failed to load PM entry data');
      } finally {
        setLoading(false);
      }
    };

    if (pm_operator_id) {
      loadData();
    }
  }, [pm_operator_id]);

  const onChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        pm_operator_id: pm_operator_id,
        action_taken: formData.action_taken || null,
        engineer_findings: formData.engineer_findings || null,
        job_start: formData.job_start || null,
        job_completion_date: formData.job_completion_date || null,
        responsible_person: formData.responsible_person || null,
        spare_usage_id: formData.spare_usage_id || null,
      };

      await client.post('/pm/engineer', payload);

      alert('PM engineer action saved successfully!');
      navigate('/preventive/entries');
    } catch (err) {
      console.error('Save PM engineer error:', err);
      alert(err?.response?.data?.message || 'Failed to save PM engineer action');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('create_pm_engineer')) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have permission to add engineer actions.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading...
      </div>
    );
  }

  if (!operatorEntry) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        PM entry not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">PM Engineer Action</h2>
          <p className="text-sm text-slate-400">
            Add engineer findings and actions for PM entry: {operatorEntry.pm_code}
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

      {/* Operator Info (Read-only) */}
      <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Operator Entry Information</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] text-slate-400">PM Code</p>
            <p className="text-xs text-slate-100">{operatorEntry.pm_code}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Asset Code</p>
            <p className="text-xs text-slate-100">{operatorEntry.asset_code || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Entry Date</p>
            <p className="text-xs text-slate-100">
              {toDateInputValue(operatorEntry.entry_date) || '-'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Operator Name</p>
            <p className="text-xs text-slate-100">{operatorEntry.operator_name || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] text-slate-400">Key Issue</p>
            <p className="text-xs text-slate-100">{operatorEntry.key_issue || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] text-slate-400">Nature of Activity</p>
            <p className="text-xs text-slate-100">{operatorEntry.nature_of_activity || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] text-slate-400">Notes</p>
            <p className="text-xs text-slate-100">{operatorEntry.note || '-'}</p>
          </div>
        </div>
      </section>

      {/* Engineer Form */}
      <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Engineer Actions & Findings</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">Action Taken</label>
              <textarea
                value={formData.action_taken}
                onChange={onChange('action_taken')}
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Engineer Findings
              </label>
              <textarea
                value={formData.engineer_findings}
                onChange={onChange('engineer_findings')}
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Job Start</label>
              <input
                type="date"
                value={formData.job_start}
                onChange={onChange('job_start')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Job Completion Date
              </label>
              <input
                type="date"
                value={formData.job_completion_date}
                onChange={onChange('job_completion_date')}
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
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Spare Usage ID</label>
              <input
                value={formData.spare_usage_id}
                onChange={onChange('spare_usage_id')}
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
              {saving ? 'Saving...' : 'Save Engineer Action'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default PMEngineerAction;
