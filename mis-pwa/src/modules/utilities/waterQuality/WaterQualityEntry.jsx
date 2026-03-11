import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const WaterQualityEntry = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    sample_point: '',
    record_date: new Date().toISOString().slice(0, 10),
    ph: '',
    tds_mg_l: '',
    hardness_mg_l: '',
    conductivity_us_cm: '',
    temperature_c: '',
    chlorine_mg_l: '',
    cod_mg_l: '',
    bod_mg_l: '',
    asset_id: '',
    location_id: '',
    business_unit_id: '',
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

  const fetchBusinessUnits = async () => {
    try {
      const res = await client.get('/utilities/business-units');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Business units error:', err);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [a, l, bu] = await Promise.all([
          fetchAssets(),
          fetchLocations(),
          fetchBusinessUnits(),
        ]);
        setAssets(a);
        setLocations(l);
        setBusinessUnits(bu);
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

    if (!hasPermission('add_water_quality')) {
      alert('You do not have permission to add water quality logs');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sample_point: formData.sample_point,
        record_date: formData.record_date,
        ph: formData.ph || null,
        tds_mg_l: formData.tds_mg_l || null,
        hardness_mg_l: formData.hardness_mg_l || null,
        conductivity_us_cm: formData.conductivity_us_cm || null,
        temperature_c: formData.temperature_c || null,
        chlorine_mg_l: formData.chlorine_mg_l || null,
        cod_mg_l: formData.cod_mg_l || null,
        bod_mg_l: formData.bod_mg_l || null,
        asset_id: formData.asset_id || null,
        location_id: formData.location_id || null,
        business_unit_id: formData.business_unit_id || null,
        remarks: formData.remarks || null,
      };

      const response = await client.post('/utilities/water-quality', payload);

      if (response.data?.data?.has_alert) {
        alert(
          `Water quality log created with alerts: ${response.data.data.alerts.join(', ')}`
        );
      } else {
        alert('Water quality log created successfully!');
      }
      navigate('/utilities/water-quality/logs');
    } catch (err) {
      console.error('Create water quality log error:', err);
      alert(err?.response?.data?.message || 'Failed to create water quality log');
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
        <h2 className="text-xl font-semibold text-slate-100">Water Quality Entry</h2>
        <button
          onClick={() => navigate('/utilities/water-quality/logs')}
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
                Sample Point *
              </label>
              <input
                type="text"
                value={formData.sample_point}
                onChange={onChange('sample_point')}
                required
                placeholder="e.g., ETP Outlet"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Record Date *
              </label>
              <input
                type="date"
                value={formData.record_date}
                onChange={onChange('record_date')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">pH</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={formData.ph}
                onChange={onChange('ph')}
                placeholder="7.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                TDS (mg/L)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.tds_mg_l}
                onChange={onChange('tds_mg_l')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Hardness (mg/L)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hardness_mg_l}
                onChange={onChange('hardness_mg_l')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Conductivity (μS/cm)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.conductivity_us_cm}
                onChange={onChange('conductivity_us_cm')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
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
                placeholder="25.0"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Chlorine (mg/L)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.chlorine_mg_l}
                onChange={onChange('chlorine_mg_l')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">COD (mg/L)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cod_mg_l}
                onChange={onChange('cod_mg_l')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">BOD (mg/L)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.bod_mg_l}
                onChange={onChange('bod_mg_l')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Asset</label>
              <select
                value={formData.asset_id}
                onChange={onChange('asset_id')}
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
              <label className="mb-1 block text-xs font-medium text-slate-300">Location</label>
              <select
                value={formData.location_id}
                onChange={onChange('location_id')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Business Unit
              </label>
              <select
                value={formData.business_unit_id}
                onChange={onChange('business_unit_id')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Select Business Unit</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.bu_name}
                  </option>
                ))}
              </select>
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
              onClick={() => navigate('/utilities/water-quality/logs')}
              disabled={saving}
              className="rounded-md border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Water Quality Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WaterQualityEntry;
