import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PMDashboard from '../modules/pm/PMDashboard';
import PMSchedule from '../modules/pm/PMSchedule';
import PMEntryList from '../modules/pm/PMEntryList';
import PMOperatorEntry from '../modules/pm/PMOperatorEntry';
import PMEngineerAction from '../modules/pm/PMEngineerAction';
import PMCompliance from '../modules/pm/PMCompliance';
import { usePermissions } from '../context/PermissionContext';

const Preventive = () => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading permissions...
      </div>
    );
  }

  // Check if user has any PM permissions
  const hasAnyPmPermission =
    hasPermission('view_pm_schedule') ||
    hasPermission('create_pm_schedule') ||
    hasPermission('view_pm_entry') ||
    hasPermission('create_pm_entry') ||
    hasPermission('create_pm_engineer') ||
    hasPermission('view_pm_compliance');

  if (!hasAnyPmPermission) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have access to Preventive Maintenance module.
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<PMDashboard />} />
      <Route path="schedule" element={<PMSchedule />} />
      <Route path="entries" element={<PMEntryList />} />
      <Route path="entry" element={<PMOperatorEntry />} />
      <Route path="engineer/:pm_operator_id" element={<PMEngineerAction />} />
      <Route path="compliance" element={<PMCompliance />} />
      <Route path="*" element={<Navigate to="/preventive" replace />} />
    </Routes>
  );
};

export default Preventive;
