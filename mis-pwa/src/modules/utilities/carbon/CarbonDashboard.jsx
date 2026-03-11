import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import client from '../../../api/client';
import { usePermissions } from '../../../context/PermissionContext';

const CarbonDashboard = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16'];

  const fetchDashboard = async () => {
    try {
      const res = await client.get('/utilities/carbon/dashboard');
      return res.data?.data ?? res.data;
    } catch (err) {
      console.error('Carbon dashboard error:', err);
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
        <h2 className="text-xl font-semibold text-slate-100">Carbon Emission Dashboard</h2>
        <div className="flex gap-2">
          {hasPermission('add_carbon_logs') && (
            <button
              onClick={() => navigate('/utilities/carbon/entry')}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Add New Entry
            </button>
          )}
          <button
            onClick={() => navigate('/utilities/carbon/logs')}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            View Logs
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs text-slate-400">Total CO2 Emissions (Last 30 Days)</p>
        <p className="text-2xl font-bold text-red-400">
          {dashboardData.total_co2e_kg.toLocaleString()} kg CO2e
        </p>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend */}
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">Monthly Emission Trend</h3>
          {dashboardData.monthly_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  style={{ fontSize: '10px' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_co2e_kg"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="CO2e (kg)"
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

        {/* Emission by Source */}
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">Emission by Source Type</h3>
          {dashboardData.by_source.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.by_source}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source_type, total_co2e_kg }) =>
                    `${source_type}: ${total_co2e_kg.toLocaleString()} kg`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_co2e_kg"
                >
                  {dashboardData.by_source.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Emission by Location */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-100">
          Emission by Location (Top 10)
        </h3>
        {dashboardData.by_location.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.by_location}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="location"
                stroke="#94a3b8"
                style={{ fontSize: '10px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                }}
              />
              <Bar dataKey="total_co2e_kg" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonDashboard;
