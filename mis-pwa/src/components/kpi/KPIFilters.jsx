import React from 'react';

const KPIFilters = ({ filters, onChange, assets }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({
      ...filters,
      [name]: value,
    });
  };

  return (
    <div className="flex flex-wrap gap-3 rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400">Asset</label>
        <select
          name="asset_id"
          value={filters.asset_id || ''}
          onChange={handleChange}
          className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
        >
          <option value="">All Assets</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.asset_code || asset.code || asset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400">Start Date</label>
        <input
          type="date"
          name="start_date"
          value={filters.start_date || ''}
          onChange={handleChange}
          className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400">End Date</label>
        <input
          type="date"
          name="end_date"
          value={filters.end_date || ''}
          onChange={handleChange}
          className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
        />
      </div>
    </div>
  );
};

export default KPIFilters;

