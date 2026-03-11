import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const CarbonEntryPage = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    source_type: 'Electricity',
    record_date: new Date().toISOString().slice(0, 10),
    energy_consumed_kwh: '',
    fuel_consumed_litre: '',
    emission_factor: '0.82',
    scope_category: 'Scope 2',
    asset_id: '',
    location_id: '',
    business_unit_id: '',
    remarks: '',
  });

  const sourceTypes = ['Electricity', 'DG Sets', 'LPG Furnace', 'Fuel Consumption'];
  const scopeCategories = ['Scope 1', 'Scope 2', 'Scope 3'];

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

    if (!hasPermission('add_carbon_logs')) {
      alert('You do not have permission to add carbon emission logs');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        source_type: formData.source_type,
        record_date: formData.record_date,
        energy_consumed_kwh: formData.energy_consumed_kwh || null,
        fuel_consumed_litre: formData.fuel_consumed_litre || null,
        emission_factor: formData.emission_factor ? Number(formData.emission_factor) : null,
        scope_category: formData.scope_category || null,
        asset_id: formData.asset_id || null,
        location_id: formData.location_id || null,
        business_unit_id: formData.business_unit_id || null,
        remarks: formData.remarks || null,
      };

      await client.post('/utilities/carbon', payload);

      alert('Carbon emission log created successfully!');
      navigate('/utilities/carbon/logs');
    } catch (err) {
      console.error('Create carbon log error:', err);
      alert(err?.response?.data?.message || 'Failed to create carbon emission log');
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
        <h2 className="text-xl font-semibold text-slate-100">Carbon Emission Entry</h2>
        <button
          onClick={() => navigate('/utilities/carbon/logs')}
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
                Source Type *
              </label>
              <select
                value={formData.source_type}
                onChange={onChange('source_type')}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                {sourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
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
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Energy Consumed (kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.energy_consumed_kwh}
                onChange={onChange('energy_consumed_kwh')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Fuel Consumed (Litre)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.fuel_consumed_litre}
                onChange={onChange('fuel_consumed_litre')}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Emission Factor
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.emission_factor}
                onChange={onChange('emission_factor')}
                placeholder="0.82"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Scope Category
              </label>
              <select
                value={formData.scope_category}
                onChange={onChange('scope_category')}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Select Scope</option>
                {scopeCategories.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
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
              onClick={() => navigate('/utilities/carbon/logs')}
              disabled={saving}
              className="rounded-md border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Carbon Emission Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarbonEntryPage;
