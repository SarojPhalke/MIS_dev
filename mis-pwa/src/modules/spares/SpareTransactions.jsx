import React, { useEffect, useState } from 'react';
import client from '../../api/client';

const toDateTime = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
  } catch {
    return '';
  }
};

const DirectionBadge = ({ direction }) => {
  const isIssue = direction === 'issue';
  const cls = isIssue
    ? 'bg-red-500/20 text-red-300 border-red-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {direction ? direction.toUpperCase() : '-'}
    </span>
  );
};

const SpareTransactions = () => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTxns = async () => {
    const res = await client.get('/spares/transactions');
    const list = res.data?.data ?? res.data;
    return Array.isArray(list) ? list : [];
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchTxns();
        setTxns(list);
      } catch (err) {
        console.error('Spare transactions load error:', err);
        alert(err?.response?.data?.message || 'Failed to load spare transactions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Spare Transactions</h2>
          <p className="text-sm text-slate-400">
            History of all spare issues and returns with running balance.
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Transaction History</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 shadow-sm">
            <table className="min-w-[1100px] w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Part Code</th>
                  <th className="px-3 py-2">Part Name</th>
                  <th className="px-3 py-2">Asset</th>
                  <th className="px-3 py-2">Direction</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="px-3 py-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t, idx) => (
                  <tr key={idx} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-3 py-2">{toDateTime(t.transaction_date) || '-'}</td>
                    <td className="px-3 py-2">{t.part_code || '-'}</td>
                    <td className="px-3 py-2">{t.part_name || '-'}</td>
                    <td className="px-3 py-2">{t.asset_code || '-'}</td>
                    <td className="px-3 py-2">
                      <DirectionBadge direction={t.direction} />
                    </td>
                    <td className="px-3 py-2">{t.quantity ?? '-'}</td>
                    <td className="px-3 py-2">{t.balance_after ?? '-'}</td>
                    <td className="px-3 py-2">{t.purpose || '-'}</td>
                  </tr>
                ))}
                {!txns.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-3 text-center text-xs text-slate-400"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default SpareTransactions;

