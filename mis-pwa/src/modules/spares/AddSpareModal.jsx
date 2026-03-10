import React, { useEffect, useState } from 'react';

const Modal = ({ title, children, onClose }) => (
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

const AddSpareModal = ({ spare, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    part_code: '',
    part_name: '',
    part_no: '',
    min_level: '',
    reorder_level: '',
    current_stock: '',
    unit_cost: '',
    supplier: '',
    spare_location: '',
    bu_name: '',
  });

  useEffect(() => {
    if (spare) {
      setForm({
        part_code: spare.part_code || '',
        part_name: spare.part_name || '',
        part_no: spare.part_no || '',
        min_level: spare.min_level ?? '',
        reorder_level: spare.reorder_level ?? '',
        current_stock: spare.current_stock ?? '',
        unit_cost: spare.unit_cost ?? '',
        supplier: spare.supplier || '',
        spare_location: spare.spare_location || '',
        bu_name: spare.bu_name || '',
      });
    }
  }, [spare]);

  const onChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        min_level: form.min_level === '' ? 0 : Number(form.min_level),
        reorder_level: form.reorder_level === '' ? 0 : Number(form.reorder_level),
        current_stock: form.current_stock === '' ? 0 : Number(form.current_stock),
        unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
      };

      const client = (await import('../../api/client')).default;

      if (!spare) {
        await client.post('/spares', payload);
      } else {
        await client.put(`/spares/${spare.id}`, payload);
      }

      onClose();
      if (onSaved) await onSaved();
    } catch (err) {
      console.error('Save spare error:', err);
      alert(err?.response?.data?.message || 'Failed to save spare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={spare ? 'Edit Spare' : 'Add Spare'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Part Code *</label>
            <input
              value={form.part_code}
              onChange={onChange('part_code')}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Part Name *</label>
            <input
              value={form.part_name}
              onChange={onChange('part_name')}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Part No</label>
            <input
              value={form.part_no}
              onChange={onChange('part_no')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Current Stock</label>
            <input
              type="number"
              value={form.current_stock}
              onChange={onChange('current_stock')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Min Level</label>
            <input
              type="number"
              value={form.min_level}
              onChange={onChange('min_level')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Reorder Level</label>
            <input
              type="number"
              value={form.reorder_level}
              onChange={onChange('reorder_level')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Unit Cost</label>
            <input
              type="number"
              step="0.01"
              value={form.unit_cost}
              onChange={onChange('unit_cost')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Supplier</label>
            <input
              value={form.supplier}
              onChange={onChange('supplier')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Location</label>
            <input
              value={form.spare_location}
              onChange={onChange('spare_location')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">BU Name</label>
            <input
              value={form.bu_name}
              onChange={onChange('bu_name')}
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
            {saving ? 'Saving...' : spare ? 'Update Spare' : 'Create Spare'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSpareModal;

