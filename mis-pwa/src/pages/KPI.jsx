import React, { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../context/PermissionContext';
import { useAuth } from '../context/AuthContext';
import {
  getKpiSummary,
  getMTTR,
  getMTBF,
  getAvailability,
  getUptime,
  getSpareCost,
} from '../services/kpiService';
import KPICard from '../components/kpi/KPICard';
import KPIChart from '../components/kpi/KPIChart';
import KPIFilters from '../components/kpi/KPIFilters';
import KPITable from '../components/kpi/KPITable';
import client from '../api/client';

const KPI = () => {
  const { hasPermission, loading: permLoading } = usePermissions();
  const { token } = useAuth();

  const [filters, setFilters] = useState({
    asset_id: '',
    start_date: '',
    end_date: '',
  });

  const [assets, setAssets] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [mttrSeries, setMttrSeries] = useState([]);
  const [availabilitySeries, setAvailabilitySeries] = useState([]);
  const [spareCostSeries, setSpareCostSeries] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canViewDashboard = hasPermission('view_kpi_dashboard');
  const canViewSummary = hasPermission('view_kpi_summary');
  const canViewCharts = hasPermission('view_kpi_charts');

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await client.get('/assets');
        const data = res.data?.data ?? res.data;
        setAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        // Non-blocking
        console.error('Failed to load assets for KPI filters:', err);
      }
    };

    if (token) {
      fetchAssets();
    }
  }, [token]);

  useEffect(() => {
    if (!canViewDashboard || permLoading) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const params = {
        asset_id: filters.asset_id || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      };

      try {
        if (canViewSummary) {
          const resSummary = await getKpiSummary(params);
          const dSummary = resSummary.data?.data ?? resSummary.data;
          setSummaryRows(Array.isArray(dSummary) ? dSummary : []);
        }

        if (canViewCharts) {
          const [mttrRes, availRes, spareRes] = await Promise.all([
            getMTTR(params),
            getAvailability(params),
            getSpareCost(params),
          ]);

          const mttrData = mttrRes.data?.data ?? mttrRes.data;
          const availabilityData = availRes.data?.data ?? availRes.data;
          const spareCostData = spareRes.data?.data ?? spareRes.data;

          setMttrSeries(Array.isArray(mttrData) ? mttrData : []);
          setAvailabilitySeries(Array.isArray(availabilityData) ? availabilityData : []);
          setSpareCostSeries(Array.isArray(spareCostData) ? spareCostData : []);
        }
      } catch (err) {
        console.error('Failed to load KPI data:', err);
        setError('Failed to load KPI data. Please try again or adjust filters.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, canViewDashboard, canViewSummary, canViewCharts, permLoading]);

  const aggregated = useMemo(() => {
    if (!Array.isArray(summaryRows) || summaryRows.length === 0) {
      return {
        mttr: null,
        mtbf: null,
        availability: null,
        uptime: null,
        spareCost: null,
      };
    }

    const totalMttr = summaryRows.reduce(
      (acc, r) => acc + (r.mttr_minutes || 0),
      0
    );
    const totalMtbf = summaryRows.reduce(
      (acc, r) => acc + (r.mtbf_hours || 0),
      0
    );
    const avgAvailability =
      summaryRows.reduce((acc, r) => acc + (r.availability_pct || 0), 0) /
      summaryRows.length;
    const avgUptime =
      summaryRows.reduce((acc, r) => acc + (r.uptime_pct || 0), 0) /
      summaryRows.length;
    const totalSpareCost = summaryRows.reduce(
      (acc, r) => acc + (r.spare_cost_total || 0),
      0
    );

    return {
      mttr: totalMttr / summaryRows.length,
      mtbf: totalMtbf / summaryRows.length,
      availability: avgAvailability,
      uptime: avgUptime,
      spareCost: totalSpareCost,
    };
  }, [summaryRows]);

  if (permLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-xs text-slate-400">
        Loading permissions...
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        You do not have access to KPI Monitoring module.
      </div>
    );
  }

  const lowestAvailability = useMemo(() => {
    const sorted = [...(summaryRows || [])].sort(
      (a, b) => (a.availability_pct || 0) - (b.availability_pct || 0)
    );
    return sorted.slice(0, 5);
  }, [summaryRows]);

  const highestMttr = useMemo(() => {
    const sorted = [...(summaryRows || [])].sort(
      (a, b) => (b.mttr_minutes || 0) - (a.mttr_minutes || 0)
    );
    return sorted.slice(0, 5);
  }, [summaryRows]);

  const highestSpareCost = useMemo(() => {
    const sorted = [...(summaryRows || [])].sort(
      (a, b) => (b.spare_cost_total || 0) - (a.spare_cost_total || 0)
    );
    return sorted.slice(0, 5);
  }, [summaryRows]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">KPI Monitoring & Dashboard</h2>
        <p className="text-sm text-slate-400">
          Asset-level maintenance KPIs with trends, availability, uptime, and spare cost.
        </p>
      </div>

      <KPIFilters filters={filters} onChange={setFilters} assets={assets} />

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/40 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          label="MTTR"
          value={
            aggregated.mttr != null ? `${aggregated.mttr.toFixed(1)} min` : '-'
          }
          subtitle="Mean Time To Repair"
        />
        <KPICard
          label="MTBF"
          value={
            aggregated.mtbf != null ? `${aggregated.mtbf.toFixed(1)} h` : '-'
          }
          subtitle="Mean Time Between Failures"
        />
        <KPICard
          label="Availability"
          value={
            aggregated.availability != null
              ? `${aggregated.availability.toFixed(1)} %`
              : '-'
          }
          subtitle="Machine Availability"
        />
        <KPICard
          label="Uptime"
          value={
            aggregated.uptime != null
              ? `${aggregated.uptime.toFixed(1)} %`
              : '-'
          }
          subtitle="Runtime vs Downtime"
        />
        <KPICard
          label="Spare Cost"
          value={
            aggregated.spareCost != null
              ? `₹ ${aggregated.spareCost.toFixed(0)}`
              : '-'
          }
          subtitle="Total Spare Consumption"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {canViewCharts && (
          <KPIChart
            title="MTTR Trend"
            data={mttrSeries}
            dataKey="mttr_minutes"
            yLabel="Minutes"
            color="#38bdf8"
          />
        )}
        {canViewCharts && (
          <KPIChart
            title="Availability Trend"
            data={availabilitySeries}
            dataKey="availability_pct"
            yLabel="%"
            color="#22c55e"
          />
        )}
        {canViewCharts && (
          <KPIChart
            title="Spare Cost Trend"
            data={spareCostSeries}
            dataKey="spare_cost_total"
            yLabel="₹"
            color="#eab308"
          />
        )}
      </div>

      {canViewSummary && <KPITable rows={summaryRows} />}

      {/* Monitoring section */}
      {canViewSummary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">
              Lowest Availability (Top 5)
            </h3>
            <ul className="space-y-1">
              {lowestAvailability.map((r) => (
                <li
                  key={`low-avail-${r.asset_code}`}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-2 py-1"
                >
                  <span className="text-slate-100">{r.asset_code}</span>
                  <span className="text-red-400">
                    {r.availability_pct != null
                      ? `${r.availability_pct.toFixed(1)} %`
                      : '-'}
                  </span>
                </li>
              ))}
              {lowestAvailability.length === 0 && (
                <li className="text-[11px] text-slate-500">No data.</li>
              )}
            </ul>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">
              Highest MTTR (Top 5)
            </h3>
            <ul className="space-y-1">
              {highestMttr.map((r) => (
                <li
                  key={`high-mttr-${r.asset_code}`}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-2 py-1"
                >
                  <span className="text-slate-100">{r.asset_code}</span>
                  <span className="text-orange-400">
                    {r.mttr_minutes != null
                      ? `${r.mttr_minutes.toFixed(1)} min`
                      : '-'}
                  </span>
                </li>
              ))}
              {highestMttr.length === 0 && (
                <li className="text-[11px] text-slate-500">No data.</li>
              )}
            </ul>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">
              Highest Spare Cost (Top 5)
            </h3>
            <ul className="space-y-1">
              {highestSpareCost.map((r) => (
                <li
                  key={`high-cost-${r.asset_code}`}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-2 py-1"
                >
                  <span className="text-slate-100">{r.asset_code}</span>
                  <span className="text-amber-400">
                    {r.spare_cost_total != null
                      ? `₹ ${r.spare_cost_total.toFixed(0)}`
                      : '-'}
                  </span>
                </li>
              ))}
              {highestSpareCost.length === 0 && (
                <li className="text-[11px] text-slate-500">No data.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-xs text-slate-400">Loading KPI data...</div>
      )}
    </div>
  );
};

export default KPI;

