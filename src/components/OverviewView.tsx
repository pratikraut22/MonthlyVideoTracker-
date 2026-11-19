import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  Box,
  CheckCircle2,
  Hourglass,
  Network,
  PlayCircle,
  Wifi,
} from 'lucide-react';
import type {
  DashboardDataSnapshot,
  DashboardOperatorSummary,
  MasterNetworkRecord,
  MonthScope,
  TrackerFilters,
} from '../types/tracker';
import {
  type ComputedOverviewStats,
  formatCurrencyINR,
  formatDateDMY,
  formatNumber,
  getWeekIndex,
  getWeekMeta,
  getWeekOptionsForMonth,
} from '../utils/analytics';
import { LastVideoSection } from './LastVideoSection';

interface OverviewViewProps {
  stats: ComputedOverviewStats;
  records: MasterNetworkRecord[];
  dashboardOperators: DashboardOperatorSummary[];
  filters: TrackerFilters;
  monthScope: MonthScope;
  cycleRangeLabel?: string;
  comparisonTotals?: DashboardDataSnapshot['totals'];
  comparisonRosterCount?: number;
  comparisonRecords?: MasterNetworkRecord[];
  comparisonMonthScope?: MonthScope;
  onUpdateFilters: (next: TrackerFilters) => void;
  onJumpToMaster: () => void;
  onJumpToOperatorQueue: (op: string) => void;
  onSelectRecord: (record: MasterNetworkRecord) => void;
}

type OpSortKey =
  | 'operationName'
  | 'total'
  | 'online'
  | 'billingDone'
  | 'totalVideos'
  | 'payoutINR'
  | 'selectedWeekBox'
  | 'selectedWeekVideos'
  | 'selectedWeekPayoutINR';

export function OverviewView({
  stats,
  records,
  dashboardOperators,
  filters,
  monthScope,
  cycleRangeLabel,
  comparisonTotals,
  comparisonRosterCount,
  comparisonRecords,
  comparisonMonthScope,
  onUpdateFilters,
  onJumpToMaster,
  onJumpToOperatorQueue,
  onSelectRecord,
}: OverviewViewProps) {
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [stateSort, setStateSort] = useState<'count' | 'pct'>('count');
  const [opSortKey, setOpSortKey] = useState<OpSortKey>('billingDone');
  const [opSortAsc, setOpSortAsc] = useState(false);

  const sortedStates = useMemo(() => {
    const list = [...stats.stateStats];
    if (stateSort === 'pct') {
      list.sort(
        (a, b) => b.attainmentPct - a.attainmentPct || b.total - a.total,
      );
    } else {
      list.sort((a, b) => b.total - a.total);
    }
    return list;
  }, [stats.stateStats, stateSort]);

  const selectedWeekIdx = getWeekIndex(filters.week);
  const activeWeekMeta = getWeekMeta(filters.week, monthScope);
  const weekOptions = getWeekOptionsForMonth(monthScope);
  const wkRangeTitle = `${weekOptions[0].wkLabel} – ${weekOptions[4].wkLabel}`;
  const defaultPulseRange =
    monthScope === 'nov2026'
      ? 'Nov 2 – Dec 6, 2026'
      : 'Sep 28 – Nov 1, 2026';
  const pulseRangeTitle = cycleRangeLabel
    ? cycleRangeLabel.replace(/\s*\(\d+ days\)$/, '')
    : defaultPulseRange;

  const marketLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const op of dashboardOperators) {
      if (op.markets) map.set(op.operationName, op.markets);
    }
    return map;
  }, [dashboardOperators]);

  const effectiveSortKey: OpSortKey = useMemo(() => {
    if (selectedWeekIdx !== null && opSortKey === 'billingDone') {
      return 'selectedWeekVideos';
    }
    if (selectedWeekIdx === null && opSortKey.startsWith('selectedWeek')) {
      return 'billingDone';
    }
    return opSortKey;
  }, [selectedWeekIdx, opSortKey]);

  const sortedOps = useMemo(() => {
    const list = [...stats.operatorStats];
    list.sort((a, b) => {
      const va = a[effectiveSortKey];
      const vb = b[effectiveSortKey];
      if (typeof va === 'string' && typeof vb === 'string') {
        return opSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const na = Number(va);
      const nb = Number(vb);
      return opSortAsc ? na - nb : nb - na;
    });
    return list;
  }, [stats.operatorStats, effectiveSortKey, opSortAsc]);

  const toggleSort = (key: OpSortKey) => {
    if (effectiveSortKey === key) setOpSortAsc(!opSortAsc);
    else {
      setOpSortKey(key);
      setOpSortAsc(false);
    }
  };

  const activeRecords = useMemo(
    () => records.filter((r) => r.type === 'ONLINE' || r.type === 'OFFLINE'),
    [records],
  );

  const kpiDerived = useMemo(() => {
    const activeTotal = Math.max(1, activeRecords.length);
    let reportedCount = 0;
    let pendingCount = 0;
    let weekVideoNetworks = 0;
    let weekOnlineCount = 0;
    let monthOnlineCount = 0;
    let weekDoneA = 0;
    let weekDoneB = 0;
    let weekDoneOthers = 0;
    let weekPendingA = 0;
    let weekPendingBO = 0;
    let weekCatACount = 0;
    let weekCatAOn = 0;
    let weekCatAOff = 0;

    for (const r of activeRecords) {
      if (selectedWeekIdx !== null) {
        const w = r.weeks[selectedWeekIdx];
        const box = w?.boxCount ?? 0;
        const vid = w?.videoCount ?? 0;
        const isReported = box > 0 || vid > 0;
        if (box > 0) weekOnlineCount++;
        if (isReported) reportedCount++;
        if (vid > 0) {
          weekVideoNetworks++;
          if (r.category === 'CATEGORY A') weekDoneA++;
          else if (r.category === 'CATEGORY B') weekDoneB++;
          else weekDoneOthers++;
        } else {
          pendingCount++;
          if (r.category === 'CATEGORY A') weekPendingA++;
          else weekPendingBO++;
        }
        if (r.category === 'CATEGORY A' && isReported) {
          weekCatACount++;
          if (box > 0) weekCatAOn++;
          else weekCatAOff++;
        }
      } else {
        if (r.totalOnDays > 0 || r.weeks.some((w) => w.boxCount > 0)) {
          monthOnlineCount++;
        }
        if (r.totalReported > 0) reportedCount++;
        if (r.videoPayment > 0) weekVideoNetworks++;
        else pendingCount++;
      }
    }

    const weekOfflineCount = Math.max(0, activeRecords.length - weekOnlineCount);
    const monthOfflineCount = Math.max(0, activeRecords.length - monthOnlineCount);

    return {
      activeCount: activeRecords.length,
      activeOnlinePct: Math.round((stats.onlineCount / activeTotal) * 100),
      monthOnlineCount,
      monthOfflineCount,
      monthOnlinePct: Math.round((monthOnlineCount / activeTotal) * 100),
      weekOnlineCount,
      weekOfflineCount,
      weekOnlinePct: Math.round((weekOnlineCount / activeTotal) * 100),
      reportedCount,
      reportedPct: Math.round((reportedCount / activeTotal) * 100),
      pendingCount,
      pendingPct: Math.round((pendingCount / activeTotal) * 100),
      weekVideoNetworks,
      weekDoneCount: weekVideoNetworks,
      weekDoneA,
      weekDoneB,
      weekDoneOthers,
      weekDonePct: Math.round((weekVideoNetworks / activeTotal) * 1000) / 10,
      weekPendingAll: pendingCount,
      weekPendingA,
      weekPendingBO,
      weekPendingPct: Math.round((pendingCount / activeTotal) * 1000) / 10,
      weekCatACount,
      weekCatAOn,
      weekCatAOff,
      weekCatAPct:
        reportedCount > 0 ? Math.round((weekCatACount / reportedCount) * 100) : 0,
      boxConfirmedPct:
        stats.totalNetworks > 0
          ? Math.round((stats.boxYesCount / stats.totalNetworks) * 100)
          : 0,
    };
  }, [activeRecords, selectedWeekIdx, stats.onlineCount, stats.totalNetworks, stats.boxYesCount]);

  const achieveDenom = Math.max(1, stats.activeAchieveCount);
  const billingDoneActivePct =
    Math.round((stats.billingDoneCount / achieveDenom) * 1000) / 10;
  const billingPendingActivePct =
    Math.round((stats.billingPendingActiveAll / achieveDenom) * 1000) / 10;
  const catAPct = Math.round((stats.catAActiveCount / achieveDenom) * 100);
  const videoPendingPct =
    stats.totalNetworks > 0
      ? Math.round((stats.videoPendingCount / stats.totalNetworks) * 100)
      : 0;
  const weekVideoPendingPct =
    stats.totalNetworks > 0
      ? Math.round((stats.activeWeekPendingVideos / stats.totalNetworks) * 100)
      : 0;
  const weekVideoDoneAllCount = Math.max(
    0,
    records.length - stats.activeWeekPendingVideos,
  );
  const monthTitle = monthScope === 'nov2026' ? 'November' : 'October';

  const maxWeeklyVal = Math.max(
    1,
    ...stats.weeklyMetrics.flatMap((w) => [
      w.videosSubmitted,
      w.boxOnlineNetworks,
    ]),
  );

  const maxDayOn = Math.max(1, ...stats.dailyHeatmap.map((d) => d.onCount));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-blue-600 rounded-xl p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Total Networks</span>
            <Network className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(stats.totalNetworks)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {kpiDerived.activeCount} active · {stats.shutdownCount} shutdown · {stats.onHoldCount} on hold
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-emerald-500 rounded-xl p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>
              {activeWeekMeta ? `Online Boxes Week ${activeWeekMeta.weekNumber}` : 'Online Boxes'}
            </span>
            <Wifi className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(
              activeWeekMeta ? kpiDerived.weekOnlineCount : kpiDerived.monthOnlineCount,
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {activeWeekMeta
              ? `${kpiDerived.weekOnlinePct}% of active · ${formatNumber(kpiDerived.weekOfflineCount)} offline`
              : `${kpiDerived.monthOnlinePct}% of active · ${formatNumber(kpiDerived.monthOfflineCount)} offline`}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-emerald-500 rounded-xl p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>
              {activeWeekMeta ? `Reported Week ${activeWeekMeta.weekNumber}` : 'Billing Done'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(
              activeWeekMeta ? kpiDerived.reportedCount : stats.billingDoneCount,
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {activeWeekMeta
              ? `${kpiDerived.reportedPct}% of active networks`
              : `${billingDoneActivePct}% of active · ${formatCurrencyINR(stats.totalPayoutINR)} payout`}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-blue-600 rounded-xl p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>
              {activeWeekMeta ? `Videos Week ${activeWeekMeta.weekNumber}` : 'Videos This Month'}
            </span>
            <PlayCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(
              activeWeekMeta ? stats.activeWeekVideos : stats.totalVideosVerified,
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            from {formatNumber(kpiDerived.weekVideoNetworks)} networks · {formatNumber(stats.totalVideosVerified)} this month
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-rose-500 rounded-xl p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>
              {activeWeekMeta ? `Pending Week ${activeWeekMeta.weekNumber}` : 'Pending Videos'}
            </span>
            <Hourglass className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(kpiDerived.pendingCount)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {kpiDerived.pendingPct}% of active · no video yet
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-amber-500 rounded-xl p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Box Status Confirmed</span>
            <Box className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(stats.boxYesCount)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {kpiDerived.boxConfirmedPct}% of all · video status YES: {formatNumber(stats.videoYesCount)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Weekly Videos & On Network Report ({wkRangeTitle})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any week column to focus the entire dashboard on that week
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs inline-block" />
                Videos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs inline-block" />
                On Network Report
              </span>
            </div>
          </div>

          <div className="relative h-60 w-full select-none">
            <svg
              viewBox="0 0 600 220"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="Weekly videos and on network report chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = 180 - tick * 145;
                const val = Math.round(tick * maxWeeklyVal);
                return (
                  <g key={tick}>
                    <line
                      x1={42}
                      y1={y}
                      x2={585}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray={tick === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={34}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {stats.weeklyMetrics.map((wk, idx) => {
                const groupX = 74 + idx * 104;
                const barW = 28;
                const gap = 8;
                const vidH = (wk.videosSubmitted / maxWeeklyVal) * 145;
                const onNetH = (wk.boxOnlineNetworks / maxWeeklyVal) * 145;
                const isHovered = hoveredWeek === idx;
                const isSelected = filters.week === wk.weekSlot;
                const isDimmed = selectedWeekIdx !== null && !isSelected;
                const centerX = groupX + barW + gap / 2;

                return (
                  <g
                    key={wk.weekLabel}
                    onMouseEnter={() => setHoveredWeek(idx)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    onClick={() =>
                      onUpdateFilters({
                        ...filters,
                        week: isSelected ? 'ALL' : wk.weekSlot,
                      })
                    }
                    className="cursor-pointer"
                    opacity={isDimmed ? 0.35 : 1}
                  >
                    {(isHovered || isSelected) && (
                      <rect
                        x={groupX - 12}
                        y={16}
                        width={barW * 2 + gap + 24}
                        height={169}
                        rx={4}
                        fill={isSelected ? '#EFF6FF' : '#F1F5F9'}
                        stroke={isSelected ? '#BFDBFE' : undefined}
                      />
                    )}
                    <rect
                      x={groupX}
                      y={180 - vidH}
                      width={barW}
                      height={Math.max(vidH, 2)}
                      rx={2}
                      fill="#2563EB"
                    />
                    {wk.videosSubmitted > 0 && (
                      <text
                        x={groupX + barW / 2}
                        y={180 - vidH - 5}
                        textAnchor="middle"
                        className="fill-blue-700 text-[10px] font-semibold font-mono"
                      >
                        {wk.videosSubmitted}
                      </text>
                    )}
                    <rect
                      x={groupX + barW + gap}
                      y={180 - onNetH}
                      width={barW}
                      height={Math.max(onNetH, 2)}
                      rx={2}
                      fill="#16A34A"
                    />
                    {wk.boxOnlineNetworks > 0 && (
                      <text
                        x={groupX + barW + gap + barW / 2}
                        y={180 - onNetH - 5}
                        textAnchor="middle"
                        className="fill-emerald-700 text-[10px] font-semibold font-mono"
                      >
                        {wk.boxOnlineNetworks}
                      </text>
                    )}
                    <text
                      x={centerX}
                      y={198}
                      textAnchor="middle"
                      className={`text-[11px] font-semibold font-mono ${
                        isSelected ? 'fill-blue-700' : 'fill-slate-800'
                      }`}
                    >
                      {wk.shortLabel} · {wk.weekLabel}
                    </text>
                    <text
                      x={centerX}
                      y={212}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px]"
                    >
                      {wk.rangeLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hoveredWeek !== null && stats.weeklyMetrics[hoveredWeek] && (
              <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs rounded-md px-3 py-2 shadow-lg pointer-events-none font-mono tabular-nums space-y-0.5">
                <div className="font-semibold text-slate-100">
                  {stats.weeklyMetrics[hoveredWeek].shortLabel} ·{' '}
                  {stats.weeklyMetrics[hoveredWeek].weekLabel} (
                  {stats.weeklyMetrics[hoveredWeek].rangeLabel})
                </div>
                <div>
                  Videos: {stats.weeklyMetrics[hoveredWeek].videosSubmitted}
                </div>
                <div>
                  On Network Report: {stats.weeklyMetrics[hoveredWeek].boxOnlineNetworks}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200/90 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {activeWeekMeta
                ? `${monthTitle} · ${activeWeekMeta.wkLabel} Billing & Category Mix`
                : `${monthTitle} Billing & Category Mix`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeWeekMeta
                ? `${activeWeekMeta.shortLabel} (${activeWeekMeta.rangeLabel}) attainment across ${formatNumber(stats.activeAchieveCount)} active networks`
                : `Billing attainment across ${formatNumber(stats.activeAchieveCount)} active networks`}
            </p>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    ...filters,
                    billing: filters.billing === 'DONE' ? 'ALL' : 'DONE',
                  })
                }
                className={`w-full text-left cursor-pointer rounded p-1 -m-1 transition-colors ${
                  filters.billing === 'DONE' ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between gap-2 text-xs mb-1">
                  <span className="font-medium text-emerald-800 truncate">
                    {activeWeekMeta ? `${activeWeekMeta.wkLabel} Done` : 'Billing Done'} (Cat A{' '}
                    {activeWeekMeta ? kpiDerived.weekDoneA : stats.billingDoneA} · B{' '}
                    {activeWeekMeta ? kpiDerived.weekDoneB : stats.billingDoneB} · Oth{' '}
                    {activeWeekMeta ? kpiDerived.weekDoneOthers : stats.billingDoneOthers})
                  </span>
                  <span className="font-mono tabular-nums text-emerald-700 font-semibold shrink-0">
                    {formatNumber(
                      activeWeekMeta ? kpiDerived.weekDoneCount : stats.billingDoneCount,
                    )}{' '}
                    ({activeWeekMeta ? kpiDerived.weekDonePct : billingDoneActivePct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        activeWeekMeta ? kpiDerived.weekDonePct : billingDoneActivePct,
                      )}%`,
                    }}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    ...filters,
                    billing: filters.billing === 'PENDING' ? 'ALL' : 'PENDING',
                  })
                }
                className={`w-full text-left cursor-pointer rounded p-1 -m-1 transition-colors ${
                  filters.billing === 'PENDING' ? 'bg-amber-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between gap-2 text-xs mb-1">
                  <span className="font-medium text-amber-800 truncate">
                    {activeWeekMeta ? `${activeWeekMeta.wkLabel} Pending` : 'Billing Pending'} (Cat A{' '}
                    {activeWeekMeta ? kpiDerived.weekPendingA : stats.billingPendingActiveA} · B/Oth{' '}
                    {activeWeekMeta ? kpiDerived.weekPendingBO : stats.billingPendingActiveBO})
                  </span>
                  <span className="font-mono tabular-nums text-amber-700 font-semibold shrink-0">
                    {formatNumber(
                      activeWeekMeta ? kpiDerived.weekPendingAll : stats.billingPendingActiveAll,
                    )}{' '}
                    ({activeWeekMeta ? kpiDerived.weekPendingPct : billingPendingActivePct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        activeWeekMeta ? kpiDerived.weekPendingPct : billingPendingActivePct,
                      )}%`,
                    }}
                  />
                </div>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
              <div className="text-xs font-medium text-slate-600">
                Roster & Network Status (
                {activeWeekMeta
                  ? `${formatNumber(kpiDerived.reportedCount)} ${activeWeekMeta.wkLabel} Active / ${formatNumber(stats.totalNetworks)} Total`
                  : `${formatNumber(stats.totalNetworks)} Total`}
                )
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    ...filters,
                    category: filters.category === 'CATEGORY A' ? 'ALL' : 'CATEGORY A',
                  })
                }
                className={`w-full text-left cursor-pointer rounded p-1 -m-1 transition-colors ${
                  filters.category === 'CATEGORY A' ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">Category A Networks</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {formatNumber(
                      activeWeekMeta ? kpiDerived.weekCatACount : stats.catAActiveCount,
                    )}{' '}
                    ({activeWeekMeta ? kpiDerived.weekCatAPct : catAPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        activeWeekMeta ? kpiDerived.weekCatAPct : catAPct,
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {activeWeekMeta ? kpiDerived.weekCatAOn : stats.catAOnline} ON ·{' '}
                  {activeWeekMeta ? kpiDerived.weekCatAOff : stats.catAOffline} OFF
                </div>
              </button>

              <button
                type="button"
                onClick={onJumpToMaster}
                className="w-full text-left cursor-pointer rounded p-1 -m-1 hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">Pending Video Networks</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {formatNumber(
                      activeWeekMeta
                        ? stats.activeWeekPendingVideos
                        : stats.videoPendingCount,
                    )}{' '}
                    ({activeWeekMeta ? weekVideoPendingPct : videoPendingPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        activeWeekMeta ? weekVideoPendingPct : videoPendingPct,
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {formatNumber(
                    activeWeekMeta ? stats.activeWeekVideos : stats.totalVideosVerified,
                  )}{' '}
                  videos recorded ·{' '}
                  {formatNumber(
                    activeWeekMeta ? weekVideoDoneAllCount : stats.videoYesCount,
                  )}{' '}
                  done
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200/90 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Monthly Landing Online ({pulseRangeTitle})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeWeekMeta
                ? `Highlighting ${activeWeekMeta.shortLabel} · ${activeWeekMeta.wkLabel} (${activeWeekMeta.rangeLabel})`
                : 'Daily active network landings recorded as ON across all 5 weeks'}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-700 min-h-[16px]">
            {hoveredDay !== null && stats.dailyHeatmap[hoveredDay] ? (
              <span>
                {stats.dailyHeatmap[hoveredDay].dayName}{' '}
                {formatDateDMY(stats.dailyHeatmap[hoveredDay].date)}:{' '}
                <strong>{stats.dailyHeatmap[hoveredDay].onCount}</strong> ON
              </span>
            ) : (
              <span className="text-slate-400">Hover any day bar to inspect</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(35,minmax(0,1fr))] gap-1 items-end h-28 pt-2 border-b border-slate-200 pb-1">
          {stats.dailyHeatmap.map((day, idx) => {
            const hPct = Math.max(6, Math.round((day.onCount / maxDayOn) * 100));
            const isWeekStart = idx % 7 === 0 && idx > 0;
            const isDimmed =
              selectedWeekIdx !== null && day.weekIndex !== selectedWeekIdx;
            const isHighlightedWeek =
              selectedWeekIdx !== null && day.weekIndex === selectedWeekIdx;
            return (
              <div
                key={day.date || idx}
                onMouseEnter={() => setHoveredDay(idx)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-full flex flex-col justify-end group cursor-pointer ${
                  isWeekStart ? 'border-l border-slate-200 pl-0.5' : ''
                } ${isDimmed ? 'opacity-25' : ''}`}
              >
                <div
                  className={`w-full rounded-t-xs transition-colors ${
                    hoveredDay === idx || isHighlightedWeek
                      ? 'bg-blue-600'
                      : day.onCount > maxDayOn * 0.65
                        ? 'bg-emerald-600'
                        : 'bg-slate-400'
                  }`}
                  style={{ height: `${hPct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-5 text-[11px] font-mono text-slate-500 mt-1.5">
          {stats.weeklyMetrics.map((wk, idx) => (
            <button
              key={wk.weekLabel}
              type="button"
              onClick={() =>
                onUpdateFilters({
                  ...filters,
                  week: filters.week === wk.weekSlot ? 'ALL' : wk.weekSlot,
                })
              }
              className={`text-left cursor-pointer hover:text-slate-900 ${
                selectedWeekIdx === idx ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              {wk.weekLabel} · {wk.rangeLabel.split('–')[0].trim()}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Top States ({stats.stateStats.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeWeekMeta
                  ? `${activeWeekMeta.wkLabel} video % & network share · click any state to filter`
                  : 'Billing done % & network share · click any state to filter'}
              </p>
            </div>
            <div
              className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0"
              role="group"
              aria-label="Sort top states"
            >
              <button
                type="button"
                onClick={() => setStateSort('count')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                  stateSort === 'count'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Count
              </button>
              <button
                type="button"
                onClick={() => setStateSort('pct')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                  stateSort === 'pct'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Done %
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0">
            {sortedStates.map((st) => {
              const active = filters.state === st.state;
              const completedCount = activeWeekMeta
                ? st.selectedWeekVideoNetworks
                : st.billingDone;
              const opPreview =
                st.operators.length > 0
                  ? ` · ${st.operators.slice(0, 3).join(', ')}${st.operators.length > 3 ? ` +${st.operators.length - 3}` : ''}`
                  : '';
              return (
                <button
                  key={st.state}
                  type="button"
                  onClick={() =>
                    onUpdateFilters({
                      ...filters,
                      state: active ? 'ALL' : st.state,
                    })
                  }
                  className={`w-full py-2 px-2 rounded text-xs text-left cursor-pointer transition-colors space-y-1 ${
                    active
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate" title={`${st.state}${opPreview}`}>
                      {st.state}{' '}
                      <span className="text-[11px] font-mono font-normal text-slate-400">
                        ({st.sharePct}%{opPreview})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 shrink-0">
                      {completedCount}/{st.total}{' '}
                      <strong
                        className={
                          st.attainmentPct < 40
                            ? 'text-red-600'
                            : st.attainmentPct >= 50
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                        }
                      >
                        {st.attainmentPct}%
                      </strong>
                    </span>
                  </div>
                  <div
                    className={`h-1.5 w-full rounded-full overflow-hidden ${
                      st.attainmentPct < 40 && !active ? 'bg-red-100' : 'bg-slate-100'
                    }`}
                  >
                    <div
                      className={`h-full transition-all ${
                        active
                          ? 'bg-blue-600'
                          : st.attainmentPct < 40
                            ? 'bg-red-600'
                            : st.attainmentPct >= 50
                              ? 'bg-emerald-600'
                              : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, st.attainmentPct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200/90 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {comparisonTotals
                ? monthScope === 'nov2026'
                  ? 'Oct → Nov 2026 Comparison'
                  : 'Nov → Oct 2026 Comparison'
                : 'Category & Program Split'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {comparisonTotals
                ? monthScope === 'nov2026'
                  ? 'November live workbook against October full cycle'
                  : 'October full cycle against November live workbook'
                : 'Click any category or program row to filter'}
            </p>

            {comparisonTotals ? (
              <div className="mt-4 divide-y divide-slate-100 text-xs">
                {[
                  {
                    label: 'Active (ON + OFF)',
                    other: comparisonTotals.allAchieve,
                    current: stats.activeAchieveCount,
                  },
                  {
                    label: 'Online Networks',
                    other: comparisonTotals.allOnline,
                    current: stats.onlineCount,
                    suffix: ' ON',
                  },
                  {
                    label: 'Category A Active',
                    other: comparisonTotals.catAAchieve,
                    current: stats.catAActiveCount,
                  },
                  {
                    label: 'Billing Achieved',
                    other: comparisonTotals.billingAchieveAll,
                    current: stats.billingDoneCount,
                  },
                  {
                    label: 'Verified Videos',
                    other: comparisonTotals.videoWeeks.reduce((s, v) => s + v, 0),
                    current: stats.totalVideosVerified,
                  },
                  {
                    label: 'BARC Active Total',
                    other: comparisonTotals.barcAchieve,
                    current: stats.barcActiveCount,
                  },
                  {
                    label: 'Total Master Roster',
                    other: comparisonRosterCount ?? comparisonTotals.videoTotalNetworks,
                    current: stats.totalNetworks,
                  },
                ].map((row) => {
                  const diff = row.current - row.other;
                  return (
                    <div
                      key={row.label}
                      className="py-2 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-600">{row.label}</span>
                      <div className="font-mono tabular-nums text-right">
                        <span className="text-slate-400">{formatNumber(row.other)}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <span className="font-semibold text-slate-900">
                          {formatNumber(row.current)}
                          {row.suffix ?? ''}
                        </span>{' '}
                        <span
                          className={
                            diff > 0
                              ? 'text-emerald-700'
                              : diff < 0
                                ? 'text-amber-700'
                                : 'text-slate-400'
                          }
                        >
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-xs">
                {[
                  { label: 'CATEGORY A', count: stats.catACount },
                  { label: 'CATEGORY B', count: stats.catBCount },
                  { label: 'OTHERS', count: stats.othersCatCount },
                ].map((c) => (
                  <div key={c.label} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">{c.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumber(c.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onJumpToMaster}
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-blue-700 hover:text-blue-800 text-left cursor-pointer"
          >
            Open filtered records in Master Tracker →
          </button>
        </section>
      </div>

      <section className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Operator Performance Matrix
              {activeWeekMeta ? ` · ${activeWeekMeta.shortLabel} (${activeWeekMeta.wkLabel})` : ''}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeWeekMeta
                ? `Showing ${activeWeekMeta.rangeLabel} box activity, videos, and estimated payouts alongside total roster`
                : 'Live operator attainment from filtered master records with market coverage'}
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {sortedOps.length} active operators
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('operationName')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Operator <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">Markets</th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('total')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Total <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('online')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Online <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">Offline</th>
                {activeWeekMeta ? (
                  <>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('selectedWeekBox')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        {activeWeekMeta.wkLabel} Box <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('selectedWeekVideos')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        {activeWeekMeta.wkLabel} Videos <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium">
                      {activeWeekMeta.wkLabel} BARC
                    </th>
                    <th className="py-2.5 px-4 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('selectedWeekPayoutINR')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        {activeWeekMeta.wkLabel} Est. Pay <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-right font-medium">BARC</th>
                    <th className="py-2.5 px-3 text-right font-medium">W1–W5 Videos</th>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('billingDone')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        Billing Done <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('totalVideos')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        Videos <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('payoutINR')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        Payout <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedOps.map((op) => {
                const donePct =
                  op.total > 0 ? Math.round((op.billingDone / op.total) * 100) : 0;
                const isSelected = filters.operator === op.operationName;
                return (
                  <tr
                    key={op.operationName}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onJumpToOperatorQueue(op.operationName)}
                        className="hover:text-blue-700 hover:underline cursor-pointer text-left"
                      >
                        {op.operationName}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {marketLookup.get(op.operationName) || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {op.total}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {op.online}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                      {op.offline}
                    </td>
                    {activeWeekMeta ? (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 font-medium">
                          {op.selectedWeekBox}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                          {op.selectedWeekVideos}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                          {op.selectedWeekBarc}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatCurrencyINR(op.selectedWeekPayoutINR)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {op.barcCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {op.weeklyVideos.join(' · ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <span className="font-semibold text-slate-900">
                            {op.billingDone}
                          </span>
                          <span className="text-slate-400"> ({donePct}%)</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                          {op.totalVideos}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatCurrencyINR(op.payoutINR)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <LastVideoSection
        records={records}
        comparisonRecords={comparisonRecords}
        comparisonMonthScope={comparisonMonthScope}
        selectedWeek={filters.week}
        monthScope={monthScope}
        onSelectRecord={onSelectRecord}
      />
    </div>
  );
}
