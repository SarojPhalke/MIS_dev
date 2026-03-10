import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';
import AddSpareModal from './AddSpareModal';
import SpareIssueModal from './SpareIssueModal';
import SpareReturnModal from './SpareReturnModal';

const StatusPill = ({ spare }) => {
  const { current_stock, min_level, reorder_level } = spare;
  const stock = Number(current_stock) || 0;
  const min = Number(min_level) || 0;
  const reorder = Number(reorder_level) || 0;

  let label = 'HEALTHY';
  let cls = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  if (stock <= min) {
    label = 'BELOW MIN';
    cls = 'bg-red-500/20 text-red-300 border-red-500/40';
  } else if (stock <= reorder) {
    label = 'REORDER';
    cls = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
};

const SpareInventory = () => {
  const { hasPermission } = usePermissions();
  const [spares, setSpares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSpare, setEditSpare] = useState(null);
  const [issueSpare, setIssueSpare] = useState(null);
  const [returnSpare, setReturnSpare] = useState(null);

  const fetchSpares = async () => {
    const res = await client.get('/spares');
    const list = res.data?.data ?? res.data;
    return Array.isArray(list) ? list : [];
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await fetchSpares();
      setSpares(list);
    } catch (err) {
      console.error('Spares load error:', err);
      alert(err?.response?.data?.message || 'Failed to load spares');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sortedSpares = useMemo(
    () =>
      [...(spares || [])].sort((a, b) =>
        String(a.part_name || '').localeCompare(String(b.part_name || ''), undefined, {
          sensitivity: 'base',
        })
      ),
    [spares]
  );

  const openAdd = () => {
    setEditSpare(null);
    setShowAddModal(true);
  };

  const openEdit = (spare) => {
    setEditSpare(spare);
    setShowAddModal(true);
  };

  const handleDelete = async (spare) => {
    if (!window.confirm(`Delete spare "${spare.part_name}"?`)) return;
    try {
      await client.delete(`/spares/${spare.id}`);
      await refresh();
    } catch (err) {
      console.error('Delete spare error:', err);
      alert(err?.response?.data?.message || 'Failed to delete spare');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Spares Inventory</h2>
          <p className="text-sm text-slate-400">
            Manage spare parts stock levels, issues, and returns.
          </p>
        </div>
        {hasPermission('create_spare') && (
          <button
            type="button"
            onClick={openAdd}
            className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
          >
            Add Spare
          </button>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Inventory</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 shadow-sm">
            <table className="min-w-[1100px] w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-3 py-2">Part Code</th>
                  <th className="px-3 py-2">Part Name</th>
                  <th className="px-3 py-2">Part No</th>
                  <th className="px-3 py-2">Current Stock</th>
                  <th className="px-3 py-2">Min Level</th>
                  <th className="px-3 py-2">Reorder Level</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSpares.map((sp) => {
                  const stock = Number(sp.current_stock) || 0;
                  const min = Number(sp.min_level) || 0;
                  const reorder = Number(sp.reorder_level) || 0;

                  let rowCls = '';
                  if (stock <= min) {
                    rowCls = 'bg-red-500/5';
                  } else if (stock <= reorder) {
                    rowCls = 'bg-amber-500/5';
                  } else {
                    rowCls = 'bg-emerald-500/5/5';
                  }

                  return (
                    <tr key={sp.id || sp.part_code} className={`border-t border-slate-800 ${rowCls}`}>
                      <td className="px-3 py-2">{sp.part_code}</td>
                      <td className="px-3 py-2">{sp.part_name}</td>
                      <td className="px-3 py-2">{sp.part_no || '-'}</td>
                      <td className="px-3 py-2">{stock}</td>
                      <td className="px-3 py-2">{min}</td>
                      <td className="px-3 py-2">{reorder}</td>
                      <td className="px-3 py-2">{sp.supplier || '-'}</td>
                      <td className="px-3 py-2">{sp.spare_location || '-'}</td>
                      <td className="px-3 py-2">
                        <StatusPill spare={sp} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {hasPermission('edit_spare') && (
                            <button
                              type="button"
                              onClick={() => openEdit(sp)}
                              className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission('issue_spare') && (
                            <button
                              type="button"
                              onClick={() => setIssueSpare(sp)}
                              className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Issue
                            </button>
                          )}
                          {hasPermission('return_spare') && (
                            <button
                              type="button"
                              onClick={() => setReturnSpare(sp)}
                              className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Return
                            </button>
                          )}
                          {hasPermission('view_spare_transactions') && (
                            <button
                              type="button"
                              onClick={() => (window.location.href = '/spares/transactions')}
                              className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              History
                            </button>
                          )}
                          {hasPermission('delete_spare') && (
                            <button
                              type="button"
                              onClick={() => handleDelete(sp)}
                              className="rounded border border-red-600 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!sortedSpares.length && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-3 text-center text-xs text-slate-400"
                    >
                      No spares found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAddModal && (
        <AddSpareModal
          spare={editSpare}
          onClose={() => setShowAddModal(false)}
          onSaved={refresh}
        />
      )}
      {issueSpare && (
        <SpareIssueModal
          spare={issueSpare}
          onClose={() => setIssueSpare(null)}
          onSaved={refresh}
        />
      )}
      {returnSpare && (
        <SpareReturnModal
          spare={returnSpare}
          onClose={() => setReturnSpare(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
};

export default SpareInventory;

