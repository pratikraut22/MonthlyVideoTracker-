import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type {
  MasterNetworkRecord,
  MonthScope,
  WeekFilter,
} from '../types/tracker';
import {
  exportRecordsToCsv,
  getWeekIndex,
  getWeekMeta,
  getWeekOptionsForMonth,
} from '../utils/analytics';

interface PendingViewProps {
  records: MasterNetworkRecord[];
  selectedWeek: WeekFilter;
  monthScope: MonthScope;
  onSelectWeek: (week: WeekFilter) => void;
  onSelectRecord: (record: MasterNetworkRecord) => void;
}

type PendingMode = 'no_video' | 'not_reported';

interface OperatorPendingStat {
  operator: string;
  pendingCount: number;
  activeTotal: number;
  pct: number;
}

export function PendingView({
  records,
  selectedWeek,
  monthScope,
  onSelectWeek,
  onSelectRecord,
}: PendingViewProps) {
  const [pendingMode, setPendingMode] = useState<PendingMode>('no_video');
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const weekOptions = getWeekOptionsForMonth(monthScope);
  const weekIdx = getWeekIndex(selectedWeek);
  const weekMeta = getWeekMeta(selectedWeek, monthScope);

  const activeRecords = useMemo(
    () =>
      records.filter(
        (rec) => rec.type === 'ONLINE' || rec.type === 'OFFLINE',
      ),
    [records],
  );

  const isRecordPending = useMemo(() => {
    return (rec: MasterNetworkRecord): boolean => {
      if (weekIdx !== null) {
        const w = rec.weeks[weekIdx];
        const boxCount = w?.boxCount ?? 0;
        const videoCount = w?.videoCount ?? 0;
        if (pendingMode === 'no_video') {
          return videoCount === 0;
        }
        return boxCount === 0 && videoCount === 0;
      }

      if (pendingMode === 'no_video') {
        return (
          rec.videoPayment === 0 &&
          rec.weeks.every((w) => w.videoCount === 0)
        );
      }
      return (
        rec.totalOnDays === 0 &&
        rec.totalReported === 0 &&
        rec.videoPayment === 0 &&
        rec.weeks.every((w) => w.boxCount === 0 && w.videoCount === 0)
      );
    };
  }, [weekIdx, pendingMode]);

  const allPendingRecords = useMemo(
    () => activeRecords.filter(isRecordPending),
    [activeRecords, isRecordPending],
  );

  const operatorStats: OperatorPendingStat[] = useMemo(() => {
    const map = new Map<string, { pending: number; active: number }>();

    for (const rec of activeRecords) {
      const op = rec.operationName || 'UNASSIGNED';
      const entry = map.get(op) ?? { pending: 0, active: 0 };
      entry.active++;
      if (isRecordPending(rec)) {
        entry.pending++;
      }
      map.set(op, entry);
    }

    return Array.from(map.entries())
      .map(([operator, counts]) => ({
        operator,
        pendingCount: counts.pending,
        activeTotal: counts.active,
        pct:
          counts.active > 0
            ? Math.round((counts.pending / counts.active) * 100)
            : 0,
      }))
      .sort(
        (a, b) =>
          b.pendingCount - a.pendingCount ||
          b.activeTotal - a.activeTotal ||
          a.operator.localeCompare(b.operator),
      );
  }, [activeRecords, isRecordPending]);

  const effectiveSelectedOperator = useMemo(() => {
    if (selectedOperator === 'ALL') return 'ALL';
    const exists = operatorStats.some((o) => o.operator === selectedOperator);
    return exists ? selectedOperator : 'ALL';
  }, [selectedOperator, operatorStats]);

  const visiblePendingRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPendingRecords.filter((rec) => {
      if (
        effectiveSelectedOperator !== 'ALL' &&
        (rec.operationName || 'UNASSIGNED') !== effectiveSelectedOperator
      ) {
        return false;
      }
      if (!q) return true;
      const hay = `${rec.code} ${rec.networkName} ${rec.state} ${rec.city} ${rec.weekUpdate} ${rec.operationName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allPendingRecords, effectiveSelectedOperator, search]);

  const overallPendingPct =
    activeRecords.length > 0
      ? Math.round((allPendingRecords.length / activeRecords.length) * 100)
      : 0;

  const scopeLabel = weekMeta
    ? `Week ${weekMeta.weekNumber}`
    : monthScope === 'nov2026'
      ? 'November 2026'
      : 'October 2026';

  const handleExportPending = () => {
    const slugOp =
      effectiveSelectedOperator === 'ALL'
        ? 'all'
        : effectiveSelectedOperator.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slugWeek = weekMeta ? `wk${weekMeta.weekNumber}` : 'month';
    const slugMonth = monthScope === 'nov2026' ? 'nov-2026' : 'oct-2026';
    exportRecordsToCsv(
      visiblePendingRows,
      monthScope,
      `${slugMonth}-pending-${slugWeek}-${slugOp}.csv`,
    );
  };

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Pending Networks
            </h2>
            <p className="text-xs text-slate-500">
              {pendingMode === 'no_video'
                ? 'Active networks without a landing video in the selected period'
                : 'Active networks with zero box days and zero videos reported'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex flex-wrap items-center bg-white border border-slate-200 rounded-lg p-1 gap-0.5"
            role="group"
            aria-label="Pending week filter"
          >
            <button
              type="button"
              onClick={() => onSelectWeek('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedWeek === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Whole Month
            </button>
            {weekOptions.map((wk) => {
              const active = selectedWeek === wk.value;
              return (
                <button
                  key={wk.value}
                  type="button"
                  onClick={() => onSelectWeek(wk.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  Week {wk.weekNumber}
                </button>
              );
            })}
          </div>

          <div
            className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-0.5"
            role="group"
            aria-label="Pending criteria mode"
          >
            <button
              type="button"
              onClick={() => setPendingMode('no_video')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                pendingMode === 'no_video'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              No video received
            </button>
            <button
              type="button"
              onClick={() => setPendingMode('not_reported')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                pendingMode === 'not_reported'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Not reported at all
            </button>
          </div>

          <button
            type="button"
            disabled={visiblePendingRows.length === 0}
            onClick={handleExportPending}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export pending list
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {allPendingRecords.length} pending
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {overallPendingPct}% of {activeRecords.length} active networks in{' '}
              {scopeLabel}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedOperator('ALL')}
            className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
              effectiveSelectedOperator === 'ALL'
                ? 'border-blue-500 bg-blue-50/40'
                : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs mb-2">
              <span className="font-semibold text-slate-900">All operators</span>
              <span className="font-mono tabular-nums">
                <strong className="text-slate-900">
                  {allPendingRecords.length}
                </strong>
                <span className="text-slate-400"> / {activeRecords.length}</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-200"
                style={{ width: `${overallPendingPct}%` }}
              />
            </div>
          </button>

          <div className="max-h-[540px] overflow-y-auto space-y-2 pr-1">
            {operatorStats.map((op) => {
              const isSelected = effectiveSelectedOperator === op.operator;
              return (
                <button
                  key={op.operator}
                  type="button"
                  onClick={() =>
                    setSelectedOperator(isSelected ? 'ALL' : op.operator)
                  }
                  className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className="font-semibold text-slate-800 truncate">
                      {op.operator}
                    </span>
                    <span className="font-mono tabular-nums whitespace-nowrap">
                      <strong className="text-slate-900">
                        {op.pendingCount}
                      </strong>
                      <span className="text-slate-400"> / {op.activeTotal}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-200"
                      style={{ width: `${op.pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Pending networks —{' '}
                {effectiveSelectedOperator === 'ALL'
                  ? 'All operators'
                  : effectiveSelectedOperator}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click a network to see its daily box status and video history (
                {visiblePendingRows.length} shown)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code, network, city..."
                  className="h-8 pl-8 pr-3 w-52 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {effectiveSelectedOperator !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedOperator('ALL')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Show all operators
                </button>
              )}
            </div>
          </div>

          {visiblePendingRows.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-2">
              <p className="text-sm font-medium text-slate-800">
                No pending networks found for this selection.
              </p>
              <p className="text-xs text-slate-500">
                Every active network matching these criteria already has a video recorded in {scopeLabel}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-4 text-left whitespace-nowrap">
                      Code
                    </th>
                    <th className="py-3 px-4 text-left whitespace-nowrap">
                      Network
                    </th>
                    <th className="py-3 px-4 text-left whitespace-nowrap">
                      State / City
                    </th>
                    <th className="py-3 px-4 text-left whitespace-nowrap">
                      Panel
                    </th>
                    <th className="py-3 px-4 text-left whitespace-nowrap">
                      Operator
                    </th>
                    <th className="py-3 px-4 text-left whitespace-nowrap">
                      Type
                    </th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">
                      Box Days
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePendingRows.map((row) => {
                    const boxDays =
                      weekIdx !== null
                        ? (row.weeks[weekIdx]?.boxCount ?? 0)
                        : row.totalOnDays;

                    return (
                      <tr
                        key={`${row.sr}-${row.code}`}
                        onClick={() => onSelectRecord(row)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {row.code}
                        </td>
                        <td
                          className="py-3 px-4 font-semibold text-slate-900 max-w-[280px] truncate"
                          title={row.networkName}
                        >
                          {row.networkName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[11px] text-slate-700 uppercase">
                            {row.state || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 uppercase">
                            {row.city || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {row.weekUpdate}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {row.operationName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${
                              row.type === 'ONLINE'
                                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
                                : 'border-amber-200 bg-amber-50/70 text-amber-700'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {boxDays}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
