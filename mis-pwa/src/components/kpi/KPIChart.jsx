import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const KPIChart = ({ title, data, dataKey, yLabel, color = '#38bdf8' }) => {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data || []} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              label={
                yLabel
                  ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#020617',
                border: '1px solid #1e293b',
                fontSize: 11,
              }}
              labelStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default KPIChart;

