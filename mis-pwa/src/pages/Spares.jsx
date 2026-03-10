import React from 'react';
import SpareInventory from '../modules/spares/SpareInventory';
import { usePermissions } from '../context/PermissionContext';

const Spares = () => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading permissions...
      </div>
    );
  }

  if (!hasPermission('view_spares_module')) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have access to Spares Inventory module.
      </div>
    );
  }

  return <SpareInventory />;
};

export default Spares;

