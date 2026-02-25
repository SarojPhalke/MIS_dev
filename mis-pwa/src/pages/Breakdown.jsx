import React, { useState } from 'react';

const Breakdown = () => {
  const [asset, setAsset] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // BDD simulation only – no API call
    setSubmitted(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Breakdown Maintenance</h2>
      <p className="text-sm text-slate-400">
        Log production breakdowns for engineer review. (UI simulation only)
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Asset / Equipment
          </label>
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            placeholder="Press Machine 1"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Breakdown Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            placeholder="Describe the symptom, alarms, and impact on production..."
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
        >
          Submit Breakdown
        </button>
      </form>

      {submitted && (
        <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
          Breakdown submitted and marked for engineer review.
        </div>
      )}
    </div>
  );
};

export default Breakdown;

