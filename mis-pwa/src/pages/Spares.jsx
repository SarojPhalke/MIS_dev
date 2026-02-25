import React from 'react';

const mockSpares = [
  { id: 1, code: 'BRG-6205', name: 'Bearing 6205', stock: 4, reorderLevel: 5 },
  { id: 2, code: 'BLT-XL', name: 'Timing Belt XL', stock: 12, reorderLevel: 10 }
];

const Spares = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Spares Inventory</h2>
      <p className="text-sm text-slate-400">
        Spare parts stock levels with reorder indicators. (Mock data)
      </p>

      <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {mockSpares.map((s) => {
              const low = s.stock < s.reorderLevel;
              return (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{s.code}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className={`px-3 py-2 ${low ? 'text-danger' : ''}`}>{s.stock}</td>
                  <td className="px-3 py-2">{s.reorderLevel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Spares;

