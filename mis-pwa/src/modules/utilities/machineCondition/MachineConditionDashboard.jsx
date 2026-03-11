import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const MachineConditionDashboard = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await client.get('/utilities/machine-condition/dashboard');
      return res.data?.data ?? res.data;
    } catch (err) {
      console.error('Machine condition dashboard error:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Machine Condition Dashboard</h2>
        <div className="flex gap-2">
          {hasPermission('add_machine_condition') && (
            <button
              onClick={() => navigate('/utilities/machine-condition/entry')}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Add New Entry
            </button>
          )}
          <button
            onClick={() => navigate('/utilities/machine-condition/logs')}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            View Logs
          </button>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Total Logs (Last 30 Days)</p>
          <p className="text-2xl font-bold text-slate-100">
            {dashboardData.health_summary.total_logs}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Alert Count</p>
          <p className="text-2xl font-bold text-orange-400">
            {dashboardData.health_summary.alert_count}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Health Percentage</p>
          <p className="text-2xl font-bold text-green-400">
            {dashboardData.health_summary.health_percentage}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Vibration Trend */}
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">Vibration Trend</h3>
          {dashboardData.vibration_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.vibration_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  style={{ fontSize: '10px' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_vibration"
                  stroke="#f97316"
                  strokeWidth={2}
                  name="Avg Vibration (mm/s)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
              No data available
            </div>
          )}
        </div>

        {/* Temperature Trend */}
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">Temperature Trend</h3>
          {dashboardData.temperature_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.temperature_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  style={{ fontSize: '10px' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_temperature"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Avg Temperature (°C)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachineConditionDashboard;
