import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

const UtilityEntryPage = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    utility_type: 'Power',
    meter_point: '',
    reading_unit: 'kWh',
    reading_value: '',
    asset_id: '',
    business_unit_id: '',
    location_id: '',
    remarks: '',
  });

  const utilityTypes = ['Power', 'Water', 'Air', 'Gas'];
  const unitOptions = {
    Power: ['kWh', 'MW', 'kW'],
    Water: ['L', 'm³', 'gal'],
    Air: ['m³', 'CFM', 'bar'],
    Gas: ['m³', 'L', 'kg'],
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

  useEffect(() => {
    // Update reading_unit when utility_type changes
    const defaultUnit = unitOptions[formData.utility_type]?.[0] || 'kWh';
    setFormData((prev) => ({ ...prev, reading_unit: defaultUnit }));
  }, [formData.utility_type]);

  const onChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('add_utility_logs')) {
      alert('You do not have permission to add utility logs');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        utility_type: formData.utility_type,
        meter_point: formData.meter_point,
        reading_unit: formData.reading_unit,
        reading_value: Number(formData.reading_value),
        asset_id: formData.asset_id || null,
        business_unit_id: formData.business_unit_id || null,
        location_id: formData.location_id || null,
        remarks: formData.remarks || null,
      };

      await client.post('/utilities', payload);

      alert('Utility log created successfully!');
      // Reset form
      setFormData({
        utility_type: 'Power',
        meter_point: '',
        reading_unit: 'kWh',
        reading_value: '',
        asset_id: '',
        business_unit_id: '',
        location_id: '',
        remarks: '',
      });
    } catch (err) {
      console.error('Create utility log error:', err);
      alert(err?.response?.data?.message || 'Failed to create utility log');
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
        <h2 className="text-xl font-semibold text-slate-100">Utility Entry</h2>
        <button
          onClick={() => navigate('/utilities/logs')}
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
                Utility Type *
              </label>
              <select
                value={formData.utility_type}
                onChange={onChange('utility_type')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                {utilityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Meter Point *
              </label>
              <input
                type="text"
                value={formData.meter_point}
                onChange={onChange('meter_point')}
                required
                placeholder="e.g., Main Panel 1"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Reading Unit *
              </label>
              <select
                value={formData.reading_unit}
                onChange={onChange('reading_unit')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                {unitOptions[formData.utility_type]?.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Reading Value *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.reading_value}
                onChange={onChange('reading_value')}
                required
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
              onClick={() => navigate('/utilities/logs')}
              disabled={saving}
              className="rounded-md border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Utility Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UtilityEntryPage;
