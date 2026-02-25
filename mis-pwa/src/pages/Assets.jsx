import React from 'react';

const mockAssets = [
  { id: 1, code: 'MCH-001', name: 'Press Machine 1', location: 'Line 1', criticality: 'High' },
  { id: 2, code: 'MCH-002', name: 'CNC Machine 2', location: 'Line 2', criticality: 'Medium' }
];

const Assets = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Asset Register</h2>
      <p className="text-sm text-slate-400">
        Master list of industrial assets with basic metadata. (Mock data)
      </p>

      <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Criticality</th>
            </tr>
          </thead>
          <tbody>
            {mockAssets.map((a) => (
              <tr key={a.id} className="border-t border-slate-800">
                <td className="px-3 py-2">{a.code}</td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2">{a.location}</td>
                <td className="px-3 py-2">{a.criticality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Assets;

