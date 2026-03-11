import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import UtilityEntryPage from '../modules/utilities/UtilityEntryPage';
import UtilityLogsPage from '../modules/utilities/UtilityLogsPage';
import UtilityDashboard from '../modules/utilities/UtilityDashboard';
import CarbonEntryPage from '../modules/utilities/carbon/CarbonEntryPage';
import CarbonLogsPage from '../modules/utilities/carbon/CarbonLogsPage';
import CarbonDashboard from '../modules/utilities/carbon/CarbonDashboard';
import WaterQualityEntry from '../modules/utilities/waterQuality/WaterQualityEntry';
import WaterQualityLogs from '../modules/utilities/waterQuality/WaterQualityLogs';
import MachineConditionEntry from '../modules/utilities/machineCondition/MachineConditionEntry';
import MachineConditionLogs from '../modules/utilities/machineCondition/MachineConditionLogs';
import MachineConditionDashboard from '../modules/utilities/machineCondition/MachineConditionDashboard';
import { usePermissions } from '../context/PermissionContext';

const Utilities = () => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading permissions...
      </div>
    );
  }

  if (!hasPermission('view_utility_logs')) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have access to Utilities Monitoring module.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800">
        <NavLink
          to="/utilities/dashboard"
          className={({ isActive }) =>
            `px-4 py-2 text-xs font-medium ${
              isActive
                ? 'border-b-2 border-accent text-accent'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          Consumption Dashboard
        </NavLink>
        <NavLink
          to="/utilities/entry"
          className={({ isActive }) =>
            `px-4 py-2 text-xs font-medium ${
              isActive
                ? 'border-b-2 border-accent text-accent'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          Utility Entry
        </NavLink>
        <NavLink
          to="/utilities/logs"
          className={({ isActive }) =>
            `px-4 py-2 text-xs font-medium ${
              isActive
                ? 'border-b-2 border-accent text-accent'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          Utility Logs
        </NavLink>
        <NavLink
          to="/utilities/carbon/logs"
          className={({ isActive }) =>
            `px-4 py-2 text-xs font-medium ${
              isActive
                ? 'border-b-2 border-red-500 text-red-400'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          Carbon Emissions
        </NavLink>
        <NavLink
          to="/utilities/water-quality/logs"
          className={({ isActive }) =>
            `px-4 py-2 text-xs font-medium ${
              isActive
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          Water Quality
        </NavLink>
        <NavLink
          to="/utilities/machine-condition/logs"
          className={({ isActive }) =>
            `px-4 py-2 text-xs font-medium ${
              isActive
                ? 'border-b-2 border-orange-500 text-orange-400'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          Machine Condition
        </NavLink>
      </div>

      {/* Routes */}
      <Routes>
        <Route index element={<Navigate to="/utilities/dashboard" replace />} />
        <Route path="dashboard" element={<UtilityDashboard />} />
        <Route path="entry" element={<UtilityEntryPage />} />
        <Route path="logs" element={<UtilityLogsPage />} />
        
        {/* Carbon Emission Routes */}
        <Route path="carbon/entry" element={<CarbonEntryPage />} />
        <Route path="carbon/logs" element={<CarbonLogsPage />} />
        <Route path="carbon/dashboard" element={<CarbonDashboard />} />
        
        {/* Water Quality Routes */}
        <Route path="water-quality/entry" element={<WaterQualityEntry />} />
        <Route path="water-quality/logs" element={<WaterQualityLogs />} />
        
        {/* Machine Condition Routes */}
        <Route path="machine-condition/entry" element={<MachineConditionEntry />} />
        <Route path="machine-condition/logs" element={<MachineConditionLogs />} />
        <Route path="machine-condition/dashboard" element={<MachineConditionDashboard />} />
      </Routes>
    </div>
  );
};

export default Utilities;

