import { useMemo, useState } from 'react';
import { CalendarCheck2, Download, Search } from 'lucide-react';
import type {
  MasterNetworkRecord,
  MonthScope,
  WeekFilter,
} from '../types/tracker';
import {
  exportLastVideoToCsv,
  formatNumber,
  formatUtcTimestamp,
  getRecordLastVideoInfo,
  getWeekMeta,
  type LastVideoReceiptInfo,
} from '../utils/analytics';

interface LastVideoSectionProps {
  records: MasterNetworkRecord[];
  comparisonRecords?: MasterNetworkRecord[];
  comparisonMonthScope?: MonthScope;
  selectedWeek: WeekFilter;
  monthScope: MonthScope;
  onSelectRecord: (record: MasterNetworkRecord) => void;
}

type RecencyFilter =
  | 'all'
  | 'has_video'
  | 'fresh'
  | 'aging'
  | 'stale'
  | 'no_video';

type SortMode = 'latest_desc' | 'oldest_asc' | 'videos_desc' | 'name_asc';

interface EnrichedLastVideoRow {
  record: MasterNetworkRecord;
  info: LastVideoReceiptInfo;
  daysSinceLast: number | null;
  priorMonthDate: string | null;
  priorMonthTs: number | null;
  priorMonthWeek: string | null;
}

export function LastVideoSection({
  records,
  comparisonRecords,
  comparisonMonthScope,
  selectedWeek,
  monthScope,
  onSelectRecord,
}: LastVideoSectionProps) {
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>('all');
  const [selectedDateIso, setSelectedDateIso] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('latest_desc');
  const [search, setSearch] = useState('');

  const activeWeekMeta = getWeekMeta(selectedWeek, monthScope);
  const currentMonthShort = monthScope === 'nov2026' ? 'Nov' : 'Oct';
  const priorMonthShort =
    comparisonMonthScope === 'oct2026'
      ? 'Oct'
      : comparisonMonthScope === 'nov2026'
        ? 'Nov'
        : '';

  const comparisonLookup = useMemo(() => {
    const map = new Map<string, LastVideoReceiptInfo>();
    if (!comparisonRecords || !comparisonMonthScope) return map;
    for (const rec of comparisonRecords) {
      if (!rec.code) continue;
      map.set(rec.code, getRecordLastVideoInfo(rec, comparisonMonthScope, 'ALL'));
    }
    return map;
  }, [comparisonRecords, comparisonMonthScope]);

  const { enrichedRows, referenceMaxTs, referenceWeekLabel } = useMemo(() => {
    const rawInfos = records.map((record) => ({
      record,
      info: getRecordLastVideoInfo(record, monthScope, selectedWeek),
    }));

    let maxTs: number | null = null;
    let maxWkLabel: string | null = null;
    for (const item of rawInfos) {
      if (item.info.timestamp !== null) {
        if (maxTs === null || item.info.timestamp > maxTs) {
          maxTs = item.info.timestamp;
          maxWkLabel = item.info.weekLabel;
        }
      }
    }

    const enriched: EnrichedLastVideoRow[] = rawInfos.map(({ record, info }) => {
      const daysSinceLast =
        maxTs !== null && info.timestamp !== null
          ? Math.max(0, Math.round((maxTs - info.timestamp) / 86_400_000))
          : null;
      const prior = record.code ? comparisonLookup.get(record.code) : undefined;
      return {
        record,
        info,
        daysSinceLast,
        priorMonthDate:
          prior && prior.timestamp !== null ? prior.formattedDate : null,
        priorMonthTs: prior?.timestamp ?? null,
        priorMonthWeek: prior?.weekLabel ?? null,
      };
    });

    return {
      enrichedRows: enriched,
      referenceMaxTs: maxTs,
      referenceWeekLabel: maxWkLabel,
    };
  }, [records, monthScope, selectedWeek, comparisonLookup]);

  const summaryStats = useMemo(() => {
    let withVideo = 0;
    let withoutVideo = 0;
    let staleCount = 0;

    for (const row of enrichedRows) {
      if (row.info.timestamp !== null) {
        withVideo++;
        if (row.daysSinceLast !== null && row.daysSinceLast > 7) {
          staleCount++;
        }
      } else {
        withoutVideo++;
      }
    }

    return {
      total: enrichedRows.length,
      withVideo,
      withoutVideo,
      staleCount,
    };
  }, [enrichedRows]);

  const dateBuckets = useMemo(() => {
    const map = new Map<
      string,
      {
        isoDate: string;
        timestamp: number;
        formattedDate: string;
        weekLabel: string;
        count: number;
      }
    >();

    for (const row of enrichedRows) {
      if (row.info.timestamp === null || !row.info.isoDate) continue;
      const existing = map.get(row.info.isoDate);
      if (existing) {
        existing.count++;
      } else {
        map.set(row.info.isoDate, {
          isoDate: row.info.isoDate,
          timestamp: row.info.timestamp,
          formattedDate: row.info.formattedDate,
          weekLabel: row.info.weekLabel ?? '',
          count: 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [enrichedRows]);

  const maxDateBucketCount = Math.max(
    1,
    summaryStats.withoutVideo,
    ...dateBuckets.map((b) => b.count),
  );

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = enrichedRows.filter((row) => {
      if (selectedDateIso === 'NONE') {
        if (row.info.timestamp !== null) return false;
      } else if (selectedDateIso !== 'ALL') {
        if (row.info.isoDate !== selectedDateIso) return false;
      }

      if (recencyFilter === 'has_video' && row.info.timestamp === null) {
        return false;
      }
      if (recencyFilter === 'no_video' && row.info.timestamp !== null) {
        return false;
      }
      if (
        recencyFilter === 'fresh' &&
        (row.daysSinceLast === null || row.daysSinceLast > 3)
      ) {
        return false;
      }
      if (
        recencyFilter === 'aging' &&
        (row.daysSinceLast === null ||
          row.daysSinceLast < 4 ||
          row.daysSinceLast > 7)
      ) {
        return false;
      }
      if (
        recencyFilter === 'stale' &&
        (row.daysSinceLast === null || row.daysSinceLast <= 7)
      ) {
        return false;
      }

      if (q) {
        const hay = `${row.record.code} ${row.record.networkName} ${row.record.state} ${row.record.city} ${row.record.operationName} ${row.info.formattedDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortMode === 'latest_desc') {
        const ta = a.info.timestamp ?? -1;
        const tb = b.info.timestamp ?? -1;
        if (tb !== ta) return tb - ta;
        return (
          (b.priorMonthTs ?? -1) - (a.priorMonthTs ?? -1) ||
          a.record.sr - b.record.sr
        );
      }
      if (sortMode === 'oldest_asc') {
        const ta = a.info.timestamp ?? Number.MAX_SAFE_INTEGER;
        const tb = b.info.timestamp ?? Number.MAX_SAFE_INTEGER;
        if (ta !== tb) return ta - tb;
        return a.record.sr - b.record.sr;
      }
      if (sortMode === 'videos_desc') {
        return (
          b.record.videoPayment - a.record.videoPayment ||
          (b.info.timestamp ?? -1) - (a.info.timestamp ?? -1)
        );
      }
      return a.record.networkName.localeCompare(b.record.networkName);
    });

    return filtered;
  }, [enrichedRows, selectedDateIso, recencyFilter, sortMode, search]);

  const handleExport = () => {
    exportLastVideoToCsv(
      visibleRows.map((r) => ({
        record: r.record,
        lastVideoDate:
          r.info.timestamp !== null
            ? r.info.formattedDate
            : `No video in ${currentMonthShort}`,
        lastVideoWeek: r.info.weekLabel ?? '—',
        daysSinceLast: r.daysSinceLast,
        priorMonthDate: r.priorMonthDate
          ? `${r.priorMonthDate} (${r.priorMonthWeek ?? priorMonthShort})`
          : null,
      })),
      monthScope,
    );
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-blue-600" />
            Last Video Received Date
            {activeWeekMeta
              ? ` · ${activeWeekMeta.shortLabel} (${activeWeekMeta.wkLabel})`
              : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            Latest: {referenceMaxTs !== null ? formatUtcTimestamp(referenceMaxTs) : '—'}
            {referenceWeekLabel ? ` (${referenceWeekLabel})` : ''} ·{' '}
            {formatNumber(summaryStats.withVideo)} with date ·{' '}
            {formatNumber(summaryStats.withoutVideo)} no date ·{' '}
            {formatNumber(summaryStats.staleCount)} over 7d old
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search network, code, date..."
              className="h-8 pl-8 pr-3 w-48 text-xs bg-white border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            aria-label="Filter last video recency"
            value={recencyFilter}
            onChange={(e) => setRecencyFilter(e.target.value as RecencyFilter)}
            className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 cursor-pointer"
          >
            <option value="all">All ({summaryStats.total})</option>
            <option value="has_video">
              Has Video ({summaryStats.withVideo})
            </option>
            <option value="fresh">Fresh (0–3d)</option>
            <option value="aging">4–7 Days Ago</option>
            <option value="stale">Over 7d ({summaryStats.staleCount})</option>
            <option value="no_video">
              No Video ({summaryStats.withoutVideo})
            </option>
          </select>

          <select
            aria-label="Sort by last video date"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 cursor-pointer"
          >
            <option value="latest_desc">Latest Date First</option>
            <option value="oldest_asc">Oldest Date First</option>
            <option value="videos_desc">Most Videos First</option>
            <option value="name_asc">Network Name (A–Z)</option>
          </select>

          <button
            type="button"
            disabled={visibleRows.length === 0}
            onClick={handleExport}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Dates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="lg:col-span-4 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-800">
              Receipt Date Breakdown
            </span>
            {selectedDateIso !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedDateIso('ALL')}
                className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Show all dates
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
            {summaryStats.withoutVideo > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedDateIso(selectedDateIso === 'NONE' ? 'ALL' : 'NONE')
                }
                className={`w-full text-left px-2.5 py-2 rounded border transition-colors cursor-pointer ${
                  selectedDateIso === 'NONE'
                    ? 'border-amber-500 bg-amber-50/70'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-amber-800">
                    No video date in{' '}
                    {activeWeekMeta ? activeWeekMeta.wkLabel : currentMonthShort}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-amber-800">
                    {summaryStats.withoutVideo}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.round(
                        (summaryStats.withoutVideo / maxDateBucketCount) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </button>
            )}

            {dateBuckets.map((bucket) => {
              const isSelected = selectedDateIso === bucket.isoDate;
              const widthPct = Math.max(
                4,
                Math.round((bucket.count / maxDateBucketCount) * 100),
              );
              return (
                <button
                  key={bucket.isoDate}
                  type="button"
                  onClick={() =>
                    setSelectedDateIso(isSelected ? 'ALL' : bucket.isoDate)
                  }
                  className={`w-full text-left px-2.5 py-2 rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-medium text-slate-800">
                      {bucket.formattedDate}{' '}
                      <span className="text-[11px] text-slate-400">
                        · {bucket.weekLabel}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {bucket.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isSelected ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 overflow-x-auto max-h-[430px] overflow-y-auto">
          {visibleRows.length === 0 ? (
            <div className="py-16 px-6 text-center text-xs text-slate-500">
              No networks match the selected video date filters.
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                    Code
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                    Network
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                    Operator · State
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                    W1–W5
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                    Last Video Received
                  </th>
                  <th className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                    Age
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  const rec = row.record;
                  const hasDate = row.info.timestamp !== null;
                  const ageText =
                    row.daysSinceLast === null
                      ? 'Pending'
                      : row.daysSinceLast === 0
                        ? 'Latest'
                        : `${row.daysSinceLast}d ago`;

                  return (
                    <tr
                      key={`${rec.sr}-${rec.code}`}
                      onClick={() => onSelectRecord(rec)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {rec.code}
                      </td>
                      <td
                        className="py-2.5 px-3 font-medium text-slate-900 max-w-[240px] truncate"
                        title={rec.networkName}
                      >
                        {rec.networkName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {rec.operationName}
                        </span>{' '}
                        <span className="text-slate-400">· {rec.state}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono text-[10px]">
                          {row.info.weekDatesSummary.map((wk) => {
                            const hasVid =
                              wk.videoCount > 0 || wk.latestTs !== null;
                            const tooltip = wk.formattedDates.length
                              ? `WK${wk.weekNumber}: ${wk.formattedDates.join(', ')}`
                              : `WK${wk.weekNumber}: No video`;
                            return (
                              <span
                                key={wk.weekNumber}
                                title={tooltip}
                                className={`px-1 py-0.5 rounded border ${
                                  hasVid
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                {wk.shortLabel}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {hasDate ? (
                          <div>
                            <span className="font-mono tabular-nums font-semibold text-slate-900">
                              {row.info.formattedDate}
                            </span>{' '}
                            <span className="font-mono text-[11px] text-blue-700">
                              {row.info.weekLabel}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400">
                              No video in{' '}
                              {activeWeekMeta
                                ? activeWeekMeta.wkLabel
                                : currentMonthShort}
                            </span>
                            {row.priorMonthDate && (
                              <div className="text-[11px] font-mono text-slate-500">
                                {priorMonthShort}: {row.priorMonthDate}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            row.daysSinceLast === null
                              ? 'text-slate-400 font-normal'
                              : row.daysSinceLast <= 3
                                ? 'text-emerald-700'
                                : row.daysSinceLast <= 7
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                          }`}
                        >
                          {ageText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
