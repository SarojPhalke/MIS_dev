import React, { useEffect, useState } from 'react';
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
import client from '../../api/client';
import { usePermissions } from '../../context/PermissionContext';

const UtilityDashboard = () => {
  const { hasPermission } = usePermissions();
  const [dailySummary, setDailySummary] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const utilityColors = {
    Power: '#eab308', // yellow
    Water: '#3b82f6', // blue
    Air: '#6b7280', // gray
    Gas: '#f97316', // orange
  };

  const COLORS = ['#eab308', '#3b82f6', '#6b7280', '#f97316'];

  const fetchDailySummary = async () => {
    try {
      const res = await client.get('/utilities/daily-summary');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Daily summary error:', err);
      return [];
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await client.get('/utilities');
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Utility logs error:', err);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summary, allLogs] = await Promise.all([fetchDailySummary(), fetchLogs()]);
        setDailySummary(summary);
        setLogs(allLogs);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Process data for daily consumption chart
  const dailyConsumptionData = React.useMemo(() => {
    const grouped = {};
    dailySummary.forEach((item) => {
      const date = item.record_day;
      if (!grouped[date]) {
        grouped[date] = { date };
      }
      grouped[date][item.utility_type] = item.total_consumption;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dailySummary]);

  // Process data for utility type distribution (pie chart)
  const utilityDistribution = React.useMemo(() => {
    const totals = {};
    logs.forEach((log) => {
      if (!totals[log.utility_type]) {
        totals[log.utility_type] = 0;
      }
      totals[log.utility_type] += log.reading_value || 0;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [logs]);

  // Process data for consumption by location (bar chart)
  const locationConsumption = React.useMemo(() => {
    const totals = {};
    logs.forEach((log) => {
      const location = log.location || 'Unknown';
      if (!totals[location]) {
        totals[location] = 0;
      }
      totals[location] += log.reading_value || 0;
    });
    return Object.entries(totals)
      .map(([location, value]) => ({ location, consumption: value }))
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 10); // Top 10 locations
  }, [logs]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Utility Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {['Power', 'Water', 'Air', 'Gas'].map((type) => {
          const total = logs
            .filter((log) => log.utility_type === type)
            .reduce((sum, log) => sum + (log.reading_value || 0), 0);
          return (
            <div
              key={type}
              className="rounded-md border border-slate-800 bg-slate-900 p-4"
            >
              <p className="text-xs text-slate-400">{type}</p>
              <p className={`text-lg font-semibold ${utilityColors[type] || 'text-slate-100'}`}>
                {total.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">
                {logs.filter((log) => log.utility_type === type).length} readings
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Consumption Line Chart */}
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">Daily Consumption</h3>
          {dailyConsumptionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyConsumptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
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
                {['Power', 'Water', 'Air', 'Gas'].map((type) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stroke={utilityColors[type]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
              No data available
            </div>
          )}
        </div>

        {/* Utility Type Distribution Pie Chart */}
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">Utility Type Distribution</h3>
          {utilityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={utilityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {utilityDistribution.map((entry, index) => (
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

      {/* Consumption by Location Bar Chart */}
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-100">
          Consumption by Location (Top 10)
        </h3>
        {locationConsumption.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationConsumption}>
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
              <Bar dataKey="consumption" fill="#3b82f6" />
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

export default UtilityDashboard;
