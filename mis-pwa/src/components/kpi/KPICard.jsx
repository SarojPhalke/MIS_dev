import React from 'react';

const KPICard = ({ label, value, subtitle, accent = 'accent' }) => {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold text-${accent}`}>{value ?? '-'}</p>
      {subtitle && (
        <p className="mt-1 text-[11px] text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default KPICard;

