import React from 'react';
import AssetRegister from '../modules/asset-register/AssetRegister';
import { usePermissions } from '../context/PermissionContext';

const Assets = () => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading permissions...
      </div>
    );
  }

  if (!hasPermission('view_asset_module')) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have access to Asset Register module.
      </div>
    );
  }

  return <AssetRegister />;
};

export default Assets;

