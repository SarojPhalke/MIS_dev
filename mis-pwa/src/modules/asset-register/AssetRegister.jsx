import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';

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

const AssetRegister = () => {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    asset_code: '',
    asset_name: '',
    asset_location: '',
    bu_name: '',
    asset_type: 'machine',
    manufacturer: '',
    model_number: '',
    model_name: '',
    install_date: '',
    asset_status: 'active',
    warranty_expiry: '',
    qr_code: ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchStats = async () => {
    const res = await client.get('/assets/stats');
    return res.data?.data ?? res.data;
  };

  const fetchAssets = async ({ status, search }) => {
    const params = {};
    if (status && status !== 'all') params.status = status;
    if (search) params.search = search;

    const res = await client.get('/assets', { params });
    const list = res.data?.data ?? res.data;
    return Array.isArray(list) ? list : [];
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        fetchStats(),
        fetchAssets({ status: statusFilter, search: debouncedSearch })
      ]);
      setStats(s);
      setAssets(a);
    } catch (err) {
      console.error('Assets load error:', err);
      alert(err?.response?.data?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const a = await fetchAssets({ status: statusFilter, search: debouncedSearch });
        setAssets(a);
      } catch (err) {
        console.error('Assets filter/search error:', err);
        alert(err?.response?.data?.message || 'Failed to load filtered assets');
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, debouncedSearch]);

  const sortedAssets = useMemo(() => {
    return [...(assets || [])].sort((a, b) =>
      String(a.asset_name || '').localeCompare(String(b.asset_name || ''), undefined, {
        sensitivity: 'base'
      })
    );
  }, [assets]);

  const openAddModal = () => {
    setEditMode(false);
    setSelectedAsset(null);
    setFormData({
      asset_code: '',
      asset_name: '',
      asset_location: '',
      bu_name: '',
      asset_type: 'machine',
      manufacturer: '',
      model_number: '',
      model_name: '',
      install_date: '',
      asset_status: 'active',
      warranty_expiry: '',
      qr_code: ''
    });
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    // Update requires an identifier. If backend doesn't return it, we can't call PUT reliably.
    if (!asset?.id) {
      alert('Cannot edit this asset: missing asset id from API response.');
      return;
    }

    setEditMode(true);
    setSelectedAsset(asset);
    setFormData({
      asset_code: asset.asset_code || '',
      asset_name: asset.asset_name || '',
      asset_location: asset.asset_location || '',
      bu_name: asset.bu_name || '',
      asset_type: asset.asset_type || 'machine',
      manufacturer: asset.manufacturer || '',
      model_number: asset.model_number || '',
      model_name: asset.model_name || '',
      install_date: toDateInputValue(asset.install_date),
      asset_status: asset.asset_status || 'active',
      warranty_expiry: toDateInputValue(asset.warranty_expiry),
      qr_code: asset.qr_code || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditMode(false);
    setSelectedAsset(null);
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
        install_date: formData.install_date || null,
        warranty_expiry: formData.warranty_expiry || null,
        asset_location: formData.asset_location || null,
        bu_name: formData.bu_name || null,
        manufacturer: formData.manufacturer || null,
        model_number: formData.model_number || null,
        model_name: formData.model_name || null,
        qr_code: formData.qr_code || null
      };

      if (!editMode) {
        await client.post('/assets', payload);
      } else {
        await client.put(`/assets/${selectedAsset.id}`, payload);
      }

      setShowModal(false);
      await refreshAll();
    } catch (err) {
      console.error('Save asset error:', err);
      alert(err?.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Asset Register</h2>
          <p className="text-sm text-slate-400">
            Master list of assets with search, filtering, and controlled updates.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
        >
          Add Asset
        </button>
      </div>

      {/* Stats */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Asset Stats</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Total Assets</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.totalAssets ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Active</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.active ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Under AMC</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.under_amc ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Inactive</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.inactive ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Disposed</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.disposed ?? 0}</p>
          </div>
        </div>
      </section>

      {/* Filter + Search */}
      <section className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-end">
        <div className="w-full md:w-64">
          <label className="mb-1 block text-xs font-medium text-slate-300">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="under_amc">under_amc</option>
            <option value="disposed">disposed</option>
          </select>
        </div>
        <div className="w-full">
          <label className="mb-1 block text-xs font-medium text-slate-300">Search</label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by asset name or code"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Search is debounced by 500ms.
          </p>
        </div>
      </section>

      {/* Table */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Assets</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <>
            {/* Mobile-first: cards */}
            <div className="space-y-2 md:hidden">
              {sortedAssets.map((a) => {
                const canEdit = !!a.id;
                return (
                  <div
                    key={a.id || a.asset_code}
                    className="rounded-md border border-slate-800 bg-slate-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {a.asset_name}
                        </p>
                        <p className="text-xs text-slate-400">{a.asset_code}</p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-200">
                        {a.asset_status || '-'}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <p className="text-[10px] text-slate-400">Location</p>
                        <p className="truncate">{a.asset_location || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">BU</p>
                        <p className="truncate">{a.bu_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Type</p>
                        <p className="truncate">{a.asset_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Manufacturer</p>
                        <p className="truncate">{a.manufacturer || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Install</p>
                        <p className="truncate">{toDateInputValue(a.install_date) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Warranty</p>
                        <p className="truncate">{toDateInputValue(a.warranty_expiry) || '-'}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(a)}
                        disabled={!canEdit}
                        className="w-full rounded-md border border-slate-600 px-2 py-2 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {canEdit ? 'Edit' : 'Edit (requires id)'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!sortedAssets.length && (
                <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-400">
                  No assets found.
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-md border border-slate-800 bg-slate-900 md:block">
              <table className="min-w-[1200px] w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Asset Code</th>
                    <th className="px-3 py-2">Asset Name</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">BU Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Manufacturer</th>
                    <th className="px-3 py-2">Model Number</th>
                    <th className="px-3 py-2">Model Name</th>
                    <th className="px-3 py-2">Install Date</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Warranty Expiry</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssets.map((a) => (
                    <tr key={a.id || a.asset_code} className="border-t border-slate-800">
                      <td className="px-3 py-2">{a.asset_code}</td>
                      <td className="px-3 py-2">{a.asset_name}</td>
                      <td className="px-3 py-2">{a.asset_location || '-'}</td>
                      <td className="px-3 py-2">{a.bu_name || '-'}</td>
                      <td className="px-3 py-2">{a.asset_type || '-'}</td>
                      <td className="px-3 py-2">{a.manufacturer || '-'}</td>
                      <td className="px-3 py-2">{a.model_number || '-'}</td>
                      <td className="px-3 py-2">{a.model_name || '-'}</td>
                      <td className="px-3 py-2">{toDateInputValue(a.install_date) || '-'}</td>
                      <td className="px-3 py-2">{a.asset_status || '-'}</td>
                      <td className="px-3 py-2">{toDateInputValue(a.warranty_expiry) || '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(a)}
                          disabled={!a?.id}
                          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {a?.id ? 'Edit' : 'Edit (requires id)'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!sortedAssets.length && (
                    <tr>
                      <td colSpan={12} className="px-3 py-3 text-center text-xs text-slate-400">
                        No assets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {showModal && (
        <Modal title={editMode ? 'Update Asset' : 'Add New Asset'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Asset Code</label>
                <input
                  value={formData.asset_code}
                  onChange={onChange('asset_code')}
                  disabled={editMode}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 disabled:opacity-60 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Asset Name</label>
                <input
                  value={formData.asset_name}
                  onChange={onChange('asset_name')}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Location</label>
                <input
                  value={formData.asset_location}
                  onChange={onChange('asset_location')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">BU Name</label>
                <input
                  value={formData.bu_name}
                  onChange={onChange('bu_name')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Asset Type</label>
                <select
                  value={formData.asset_type}
                  onChange={onChange('asset_type')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="machine">machine</option>
                  <option value="utility">utility</option>
                  <option value="auxiliary">auxiliary</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Status</label>
                <select
                  value={formData.asset_status}
                  onChange={onChange('asset_status')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="under_amc">under_amc</option>
                  <option value="disposed">disposed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Manufacturer</label>
                <input
                  value={formData.manufacturer}
                  onChange={onChange('manufacturer')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Model Number</label>
                <input
                  value={formData.model_number}
                  onChange={onChange('model_number')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Model Name</label>
                <input
                  value={formData.model_name}
                  onChange={onChange('model_name')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Install Date</label>
                <input
                  type="date"
                  value={formData.install_date}
                  onChange={onChange('install_date')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Warranty Expiry</label>
                <input
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={onChange('warranty_expiry')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">QR Code</label>
                <input
                  value={formData.qr_code}
                  onChange={onChange('qr_code')}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
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
                {saving ? 'Saving...' : editMode ? 'Update Asset' : 'Create Asset'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AssetRegister;

