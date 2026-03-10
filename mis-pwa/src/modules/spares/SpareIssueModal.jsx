import React, { useEffect, useState } from 'react';
import client from '../../api/client';

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
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

const SpareIssueModal = ({ spare, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    quantity: '',
    asset_id: '',
    pm_bd_id: '',
    pm_bd_type: 'PM',
    purpose: '',
  });

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await client.get('/assets');
        const list = res.data?.data ?? res.data;
        setAssets(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Load assets error:', err);
      }
    };
    fetchAssets();
  }, []);

  const onChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        part_id: spare.id,
        quantity: Number(form.quantity),
        asset_id: form.asset_id || null,
        pm_bd_id: form.pm_bd_id || null,
        pm_bd_type: form.pm_bd_type ? form.pm_bd_type.toLowerCase() : null,
        purpose: form.purpose || null,
      };

      await client.post('/spares/issue', payload);

      alert('Spare issued successfully');
      onClose();
      if (onSaved) await onSaved();
    } catch (err) {
      console.error('Issue spare error:', err);
      alert(err?.response?.data?.message || 'Failed to issue spare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Issue Spare - ${spare?.part_code || ''}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] text-slate-400">Spare</p>
            <p className="text-xs text-slate-100">
              {spare?.part_code} - {spare?.part_name}
            </p>
            <p className="text-[10px] text-slate-400">
              Stock: <span className="text-slate-100">{spare?.current_stock}</span>
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Quantity *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={onChange('quantity')}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Asset</label>
            <select
              value={form.asset_id}
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
            <label className="mb-1 block text-xs font-medium text-slate-300">PM / BD Job</label>
            <input
              value={form.pm_bd_id}
              onChange={onChange('pm_bd_id')}
              placeholder="Job ID"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Type</label>
            <select
              value={form.pm_bd_type}
              onChange={onChange('pm_bd_type')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            >
              <option value="PM">PM</option>
              <option value="BD">BD</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-300">Purpose</label>
            <textarea
              value={form.purpose}
              onChange={onChange('purpose')}
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
            {saving ? 'Issuing...' : 'Issue Spare'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SpareIssueModal;

