import { useMemo, useState } from 'react';
import { Clock, IndianRupee, Search, Tv } from 'lucide-react';
import type { DthLogEntry, SonyActivityRow, WeekFilter } from '../types/tracker';
import {
  formatCurrencyINR,
  getWeekMeta,
  getWeekNumberForDate,
} from '../utils/analytics';

interface DthSonyViewProps {
  dthLogs: DthLogEntry[];
  sonyDates: string[];
  sonyActivity: SonyActivityRow[];
  selectedWeek: WeekFilter;
}

export function DthSonyView({
  dthLogs,
  sonyDates,
  sonyActivity,
  selectedWeek,
}: DthSonyViewProps) {
  const [subTab, setSubTab] = useState<'dth' | 'sony'>('dth');
  const [dthOp, setDthOp] = useState('ALL');
  const [dthSearch, setDthSearch] = useState('');

  const weekMeta = getWeekMeta(selectedWeek);

  const weekScopedDth = useMemo(() => {
    if (selectedWeek === 'ALL') return dthLogs;
    return dthLogs.filter((row) => getWeekNumberForDate(row.date) === selectedWeek);
  }, [dthLogs, selectedWeek]);

  const dthOperators = useMemo(
    () =>
      Array.from(
        new Set(weekScopedDth.map((d) => d.operator).filter(Boolean)),
      ).sort(),
    [weekScopedDth],
  );

  const dthSummary = useMemo(() => {
    let totalAmount = 0;
    let payableEntries = 0;
    let excludedEntries = 0;
    const byOp = new Map<string, { logs: number; payable: number; amount: number }>();

    for (const row of weekScopedDth) {
      const op = row.operator || 'UNKNOWN';
      let entry = byOp.get(op);
      if (!entry) {
        entry = { logs: 0, payable: 0, amount: 0 };
        byOp.set(op, entry);
      }
      entry.logs++;
      if (row.amount !== null && row.amount > 0) {
        totalAmount += row.amount;
        payableEntries++;
        entry.payable++;
        entry.amount += row.amount;
      } else if (row.rawAmount.toUpperCase().includes('NOT CONSIDER')) {
        excludedEntries++;
      }
    }

    return {
      totalAmount,
      payableEntries,
      excludedEntries,
      byOp: Array.from(byOp.entries()).sort((a, b) => b[1].amount - a[1].amount),
    };
  }, [weekScopedDth]);

  const filteredDth = useMemo(() => {
    const q = dthSearch.trim().toLowerCase();
    return weekScopedDth.filter((row) => {
      if (dthOp !== 'ALL' && row.operator !== dthOp) return false;
      if (q) {
        const hay = `${row.date} ${row.networkName} ${row.operator} ${row.rawAmount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [weekScopedDth, dthOp, dthSearch]);

  const visibleSonyDateIndices = useMemo(() => {
    if (selectedWeek === 'ALL') return sonyDates.map((_, idx) => idx);
    return sonyDates
      .map((d, idx) => (getWeekNumberForDate(d) === selectedWeek ? idx : -1))
      .filter((idx) => idx !== -1);
  }, [sonyDates, selectedWeek]);

  const activeSonyDates =
    visibleSonyDateIndices.length > 0
      ? visibleSonyDateIndices.map((idx) => sonyDates[idx])
      : [];

  const sonyTotalCount = useMemo(() => {
    if (selectedWeek === 'ALL') {
      return sonyActivity.reduce((s, r) => s + r.totalCount, 0);
    }
    return sonyActivity.reduce(
      (s, r) =>
        s +
        visibleSonyDateIndices.reduce(
          (acc, idx) => acc + (r.dailyValues[idx]?.value ?? 0),
          0,
        ),
      0,
    );
  }, [sonyActivity, selectedWeek, visibleSonyDateIndices]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-md border border-slate-200"
          role="group"
        >
          <button
            type="button"
            onClick={() => setSubTab('dth')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'dth'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DTH Timestamped Log ({weekScopedDth.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sony')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'sony'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sony Activity TN / Puducherry ({sonyActivity.length} DPOs)
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500">
          {subTab === 'dth'
            ? 'Sheet note: SAMEER TATA PLAY - PAY · AIRTEL UP NOT PAY'
            : `${weekMeta ? `${weekMeta.wkLabel} ` : ''}Sony DPO spots: ${sonyTotalCount}`}
        </div>
      </div>

      {subTab === 'dth' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {weekMeta ? `${weekMeta.wkLabel} DTH Entries` : 'DTH Total Log Entries'}
                </span>
                <Tv className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {weekScopedDth.length}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {dthSummary.payableEntries} payable · {dthSummary.excludedEntries} excluded (No Date)
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {weekMeta ? `${weekMeta.wkLabel} DTH Payout` : 'DTH Approved Payout'}
                </span>
                <IndianRupee className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatCurrencyINR(dthSummary.totalAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono">
                ₹15 per verified DTH spot
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs text-slate-500 mb-2">Operator Breakdown</div>
              <div className="space-y-1 text-xs font-mono tabular-nums">
                {dthSummary.byOp.length === 0 ? (
                  <div className="text-slate-400">No entries in selected week</div>
                ) : (
                  dthSummary.byOp.map(([op, info]) => (
                    <div key={op} className="flex justify-between">
                      <span className="text-slate-700 font-medium">{op}</span>
                      <span className="text-slate-600">
                        {info.logs} logs · {formatCurrencyINR(info.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter DTH by operator"
                  value={dthOp}
                  onChange={(e) => setDthOp(e.target.value)}
                  className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All DTH Operators</option>
                  {dthOperators.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {filteredDth.length} entries
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={dthSearch}
                  onChange={(e) => setDthSearch(e.target.value)}
                  placeholder="Search DTH network or date..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-medium">Date</th>
                    <th className="py-2.5 px-3 text-left font-medium">DTH Network</th>
                    <th className="py-2.5 px-3 text-left font-medium">Timing</th>
                    <th className="py-2.5 px-3 text-left font-medium">Operator</th>
                    <th className="py-2.5 px-3 text-right font-medium">Count</th>
                    <th className="py-2.5 px-4 text-right font-medium">Amount / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDth.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {row.networkName}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {row.timing}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {row.operator}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {row.count}
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                          row.amount !== null
                            ? 'font-semibold text-emerald-700'
                            : row.rawAmount.includes('NOT')
                              ? 'text-red-700 font-medium'
                              : 'text-slate-400'
                        }`}
                      >
                        {row.amount !== null
                          ? formatCurrencyINR(row.amount)
                          : row.rawAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Sony Activity — Tamil Nadu & Puducherry DPO Tracker
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {weekMeta
                  ? activeSonyDates.length > 0
                    ? `Filtered to ${weekMeta.wkLabel} (${activeSonyDates.length} dates logged)`
                    : `No Sony Activity dates logged during ${weekMeta.wkLabel} (Sony logs cover Oct 21 – Oct 30 in WK43 & WK44)`
                  : 'Daily landing counts recorded from 21/10/2026 to 30/10/2026'}
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {sonyActivity.length} DPOs · {sonyTotalCount} spots
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 text-left font-medium">Code</th>
                  <th className="py-2.5 px-3 text-left font-medium">DPO Name</th>
                  <th className="py-2.5 px-3 text-left font-medium">State · City</th>
                  <th className="py-2.5 px-3 text-left font-medium">Group</th>
                  {activeSonyDates.map((d) => (
                    <th
                      key={d}
                      className="py-2.5 px-2 text-center font-mono text-[11px] font-medium whitespace-nowrap"
                    >
                      {d.replace('/2026', '')}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-medium">
                    {weekMeta ? `${weekMeta.wkLabel} Total` : 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sonyActivity.map((row, idx) => {
                  const rowWeekTotal =
                    selectedWeek === 'ALL'
                      ? row.totalCount
                      : visibleSonyDateIndices.reduce(
                          (acc, dIdx) => acc + (row.dailyValues[dIdx]?.value ?? 0),
                          0,
                        );
                  return (
                    <tr key={`${row.code}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 min-w-[240px]">
                        {row.dpoName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {row.state} · {row.city}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.type}
                      </td>
                      {visibleSonyDateIndices.map((dIdx) => {
                        const dv = row.dailyValues[dIdx];
                        return (
                          <td
                            key={dv.date}
                            className={`py-2 px-2 text-center font-mono tabular-nums ${
                              dv.value !== null && dv.value > 0
                                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                                : 'text-slate-300'
                            }`}
                          >
                            {dv.value !== null ? dv.value : '·'}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {rowWeekTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
