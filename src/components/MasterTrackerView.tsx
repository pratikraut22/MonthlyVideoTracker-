import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
} from 'lucide-react';
import type { MasterNetworkRecord, WeekFilter } from '../types/tracker';
import {
  exportRecordsToCsv,
  formatCurrencyINR,
  getWeekIndex,
  getWeekMeta,
} from '../utils/analytics';
import { BillingIndicator, NetworkTypeIndicator } from './StatusText';

interface MasterTrackerViewProps {
  records: MasterNetworkRecord[];
  selectedWeek: WeekFilter;
  onSelectRecord: (record: MasterNetworkRecord) => void;
  onResetFilters: () => void;
}

type ColumnMode = 'summary' | 'daily' | 'weekly' | 'billing';
type WeekActivityFilter = 'all' | 'active' | 'video_done' | 'missing_video';
type SortKey =
  | 'sr'
  | 'networkName'
  | 'state'
  | 'operationName'
  | 'totalReported'
  | 'videoPayment'
  | 'finalAmountToPay';

export function MasterTrackerView({
  records,
  selectedWeek,
  onSelectRecord,
  onResetFilters,
}: MasterTrackerViewProps) {
  const [mode, setMode] = useState<ColumnMode>('summary');
  const [weekActivity, setWeekActivity] = useState<WeekActivityFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('sr');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const weekIdx = getWeekIndex(selectedWeek);
  const weekMeta = getWeekMeta(selectedWeek);

  useEffect(() => {
    if (selectedWeek === 'ALL') {
      setWeekActivity('all');
    }
  }, [selectedWeek]);

  const weekFilteredRecords = useMemo(() => {
    if (weekIdx === null || weekActivity === 'all') return records;
    return records.filter((rec) => {
      const w = rec.weeks[weekIdx];
      if (!w) return false;
      if (weekActivity === 'active') {
        return w.boxCount > 0 || w.videoCount > 0 || Boolean(w.remark);
      }
      if (weekActivity === 'video_done') {
        return w.videoCount > 0;
      }
      return w.videoCount === 0;
    });
  }, [records, weekIdx, weekActivity]);

  useEffect(() => {
    setPage(1);
  }, [weekFilteredRecords.length, pageSize]);

  const sortedRecords = useMemo(() => {
    const list = [...weekFilteredRecords];
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const na = Number(va);
      const nb = Number(vb);
      return sortAsc ? na - nb : nb - na;
    });
    return list;
  }, [weekFilteredRecords, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRecords.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === 'sr' || key === 'networkName');
    }
  };

  const allDailyHeaders = weekFilteredRecords[0]?.daily ?? records[0]?.daily ?? [];
  const visibleDailySlice =
    weekIdx !== null
      ? {
          start: weekIdx * 7,
          end: weekIdx * 7 + 7,
          headers: allDailyHeaders.slice(weekIdx * 7, weekIdx * 7 + 7),
        }
      : {
          start: 0,
          end: allDailyHeaders.length,
          headers: allDailyHeaders,
        };

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200"
            role="group"
            aria-label="Master table column mode"
          >
            {(
              [
                { id: 'summary', label: 'Summary' },
                {
                  id: 'daily',
                  label: weekMeta ? `${weekMeta.wkLabel} Daily` : '35-Day Matrix',
                },
                {
                  id: 'weekly',
                  label: weekMeta ? `${weekMeta.wkLabel} Video Log` : 'W40–W44 Logs',
                },
                { id: 'billing', label: 'Billing & Payouts' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  mode === tab.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {weekMeta && (
            <div
              className="inline-flex items-center bg-blue-50/70 p-0.5 rounded-md border border-blue-200/80"
              role="group"
              aria-label="Week activity filter"
            >
              {(
                [
                  { id: 'all', label: 'All Rows' },
                  { id: 'active', label: `Active ${weekMeta.shortLabel}` },
                  { id: 'video_done', label: 'Video Done' },
                  { id: 'missing_video', label: 'No Video' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWeekActivity(opt.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    weekActivity === opt.id
                      ? 'bg-white text-blue-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded text-slate-700 cursor-pointer"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <button
            type="button"
            onClick={() => exportRecordsToCsv(sortedRecords)}
            disabled={sortedRecords.length === 0}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Filtered CSV
          </button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="py-16 px-6 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800">
            No networks match your active filter criteria.
          </p>
          <p className="text-xs text-slate-500">
            Adjust search terms, week activity scope, or reset filters to inspect all master records.
          </p>
          <button
            type="button"
            onClick={() => {
              setWeekActivity('all');
              onResetFilters();
            }}
            className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('sr')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    SR <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Code</th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('networkName')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Network Name <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('operationName')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Operator <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>

                {mode === 'summary' && (
                  <>
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('state')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        State / City <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Type</th>
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Cat · Prog</th>
                    {weekMeta ? (
                      <>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          {weekMeta.wkLabel} Box
                        </th>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          {weekMeta.wkLabel} Vid
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                          {weekMeta.wkLabel} Date / Remark
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Machine</th>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('totalReported')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            Reported <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('videoPayment')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            Videos <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Billing</th>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('finalAmountToPay')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        Amount <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </>
                )}

                {mode === 'daily' && (
                  <>
                    {visibleDailySlice.headers.map((dh, idx) => (
                      <th
                        key={dh.date || idx}
                        className={`py-2 px-1.5 text-center font-mono text-[10px] font-medium whitespace-nowrap ${
                          idx % 7 === 0 ? 'border-l border-slate-200' : ''
                        }`}
                        title={`${dh.dayName} ${dh.date}`}
                      >
                        {weekIdx !== null
                          ? `${dh.dayName.slice(0, 3)} ${dh.date.replace('/2026', '')}`
                          : dh.date.replace('/2026', '')}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                      {weekMeta ? `${weekMeta.wkLabel} ON` : 'ON Days'}
                    </th>
                  </>
                )}

                {mode === 'weekly' && (
                  <>
                    {weekIdx !== null ? (
                      <>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap border-l border-slate-200">
                          Box Days
                        </th>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          Video Count
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                          Video 1
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                          Video 2
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                          Video 3
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                          Date / Remark
                        </th>
                        <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          BARC
                        </th>
                      </>
                    ) : (
                      [40, 41, 42, 43, 44].map((wk) => (
                        <th
                          key={wk}
                          className="py-2.5 px-3 text-left font-medium whitespace-nowrap border-l border-slate-200"
                        >
                          Week {wk} (Box · Vid · Date)
                        </th>
                      ))
                    )}
                  </>
                )}

                {mode === 'billing' && (
                  <>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Total Rep.</th>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Box Wks</th>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Vid Pay</th>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Vid Bill</th>
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Video Status</th>
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Box Status</th>
                    <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">As Per Billing</th>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Rate</th>
                    <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Final Pay</th>
                  </>
                )}

                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pageRows.map((row) => {
                const activeWk = weekIdx !== null ? row.weeks[weekIdx] : null;
                const dailySlice = row.daily.slice(
                  visibleDailySlice.start,
                  visibleDailySlice.end,
                );
                const sliceOnCount = dailySlice.filter((d) => d.on).length;

                return (
                  <tr
                    key={`${row.sr}-${row.code}`}
                    onClick={() => onSelectRecord(row)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {row.sr}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                      {row.code}
                    </td>
                    <td
                      className="py-2 px-3 font-medium text-slate-900 max-w-[260px] truncate"
                      title={row.networkName}
                    >
                      {row.networkName}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {row.operationName}
                    </td>

                    {mode === 'summary' && (
                      <>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap max-w-[180px] truncate">
                          {row.state} · {row.city}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <NetworkTypeIndicator type={row.type} />
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {row.category.replace('CATEGORY ', 'CAT ')} · {row.weekUpdate}
                        </td>
                        {activeWk ? (
                          <>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                              {activeWk.boxCount}d
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono tabular-nums font-medium ${
                                activeWk.videoCount > 0 ? 'text-blue-700' : 'text-slate-400'
                              }`}
                            >
                              {activeWk.videoCount}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600 max-w-[170px] truncate">
                              {[activeWk.video1, activeWk.remark, activeWk.weekRemark]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                              {row.machineNo}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                              {row.totalReported}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                              {row.videoPayment}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <BillingIndicator status={row.asPerBilling} />
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrencyINR(row.finalAmountToPay)}
                        </td>
                      </>
                    )}

                    {mode === 'daily' && (
                      <>
                        {dailySlice.map((d, idx) => (
                          <td
                            key={d.date || idx}
                            className={`py-2 px-1 text-center ${
                              idx % 7 === 0 ? 'border-l border-slate-200' : ''
                            }`}
                            title={`${d.date} (${d.dayName}): ${d.on ? 'ON' : 'OFF'}`}
                          >
                            <span
                              className={`inline-block w-3 h-3 rounded-xs ${
                                d.on ? 'bg-emerald-500' : 'bg-slate-100'
                              }`}
                            />
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {sliceOnCount}
                        </td>
                      </>
                    )}

                    {mode === 'weekly' && (
                      <>
                        {activeWk ? (
                          <>
                            <td className="py-2 px-3 text-right font-mono tabular-nums border-l border-slate-200 text-slate-700">
                              {activeWk.boxCount}d
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono tabular-nums font-semibold ${
                                activeWk.videoCount > 0 ? 'text-blue-700' : 'text-slate-400'
                              }`}
                            >
                              {activeWk.videoCount}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {activeWk.video1 || '—'}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {activeWk.video2 || '—'}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {activeWk.video3 || '—'}
                            </td>
                            <td className="py-2 px-3 text-amber-800 max-w-[200px] truncate">
                              {[activeWk.date, activeWk.remark, activeWk.weekRemark]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700">
                              {activeWk.barcFlag}
                            </td>
                          </>
                        ) : (
                          row.weeks.map((w) => (
                            <td
                              key={w.weekNumber}
                              className="py-2 px-3 border-l border-slate-200 font-mono tabular-nums whitespace-nowrap"
                            >
                              <span className="text-slate-700">{w.boxCount}d</span>
                              <span className="text-slate-300"> / </span>
                              <span
                                className={
                                  w.videoCount > 0
                                    ? 'font-semibold text-blue-700'
                                    : 'text-slate-400'
                                }
                              >
                                {w.videoCount}v
                              </span>
                              {w.video1 && (
                                <span className="text-slate-500 ml-1.5 text-[11px]">
                                  {w.video1}
                                </span>
                              )}
                              {w.remark && (
                                <span className="text-amber-700 ml-1.5 text-[11px]">
                                  ({w.remark})
                                </span>
                              )}
                            </td>
                          ))
                        )}
                      </>
                    )}

                    {mode === 'billing' && (
                      <>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                          {row.totalReported}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                          {row.boxCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                          {row.videoPayment}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                          {row.videoBilling}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <BillingIndicator status={row.videoStatus} />
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <BillingIndicator status={row.boxStatus} />
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <BillingIndicator status={row.asPerBilling} />
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {row.budgetLabel}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrencyINR(row.finalAmountToPay)}
                        </td>
                      </>
                    )}

                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(row);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                      >
                        Details <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
        <div className="font-mono tabular-nums">
          Page <strong className="text-slate-900">{safePage}</strong> of{' '}
          <strong className="text-slate-900">{totalPages}</strong> ·{' '}
          {sortedRecords.length} rows
        </div>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 px-2.5 inline-flex items-center gap-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 inline-flex items-center gap-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
