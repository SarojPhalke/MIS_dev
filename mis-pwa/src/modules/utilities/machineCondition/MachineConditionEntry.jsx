import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const MachineConditionEntry = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    asset_id: '',
    log_date: new Date().toISOString().slice(0, 10),
    shift: '',
    temperature_c: '',
    vibration_mm_s: '',
    noise_db: '',
    pressure_bar: '',
    current_amp: '',
    voltage_v: '',
    remarks: '',
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

    if (!hasPermission('add_machine_condition')) {
      alert('You do not have permission to add machine condition logs');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        asset_id: formData.asset_id,
        log_date: formData.log_date,
        shift: formData.shift || null,
        temperature_c: formData.temperature_c || null,
        vibration_mm_s: formData.vibration_mm_s || null,
        noise_db: formData.noise_db || null,
        pressure_bar: formData.pressure_bar || null,
        current_amp: formData.current_amp || null,
        voltage_v: formData.voltage_v || null,
        remarks: formData.remarks || null,
      };

      const response = await client.post('/utilities/machine-condition', payload);

      if (response.data?.data?.condition_alert) {
        alert(
          `Machine condition log created with alerts: ${response.data.data.alerts.join(', ')}`
        );
      } else {
        alert('Machine condition log created successfully!');
      }
      navigate('/utilities/machine-condition/logs');
    } catch (err) {
      console.error('Create machine condition log error:', err);
      alert(err?.response?.data?.message || 'Failed to create machine condition log');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Machine Condition Entry</h2>
        <button
          onClick={() => navigate('/utilities/machine-condition/logs')}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          View Logs
        </button>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Asset *
              </label>
              <select
                value={formData.asset_id}
                onChange={onChange('asset_id')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Select Asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_code} - {a.asset_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Log Date *
              </label>
              <input
                type="date"
                value={formData.log_date}
                onChange={onChange('log_date')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Shift</label>
              <select
                value={formData.shift}
                onChange={onChange('shift')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Select Shift</option>
                {shifts.map((s) => (
                  <option key={s.shift_id} value={s.shift_id}>
                    {s.shift_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature_c}
                onChange={onChange('temperature_c')}
                placeholder="0.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Vibration (mm/s)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.vibration_mm_s}
                onChange={onChange('vibration_mm_s')}
                placeholder="0.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Noise (dB)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.noise_db}
                onChange={onChange('noise_db')}
                placeholder="0.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Pressure (bar)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.pressure_bar}
                onChange={onChange('pressure_bar')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Current (Amp)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.current_amp}
                onChange={onChange('current_amp')}
                placeholder="0.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Voltage (V)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.voltage_v}
                onChange={onChange('voltage_v')}
                placeholder="0.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={onChange('remarks')}
              rows={3}
              placeholder="Additional notes..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/utilities/machine-condition/logs')}
              disabled={saving}
              className="rounded-md border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Machine Condition Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineConditionEntry;
