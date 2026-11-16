import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Film,
  IndianRupee,
  Radio,
  RotateCcw,
  Search,
} from 'lucide-react';
import type {
  DashboardDataSnapshot,
  DashboardOperatorSummary,
  WeekFilter,
} from '../types/tracker';
import { formatNumber, getWeekIndex } from '../utils/analytics';

interface DashboardSnapshotViewProps {
  snapshot: DashboardDataSnapshot;
  baselineTotals: DashboardDataSnapshot['totals'];
  baselineOperators: DashboardOperatorSummary[];
  selectedWeek: WeekFilter;
  onSelectWeek: (week: WeekFilter) => void;
  onSwitchToOct?: () => void;
  sectionFocus?: 'overview' | 'operators' | 'billing';
}

type OpSortKey =
  | 'operationName'
  | 'allTotal'
  | 'allOnline'
  | 'catATotal'
  | 'billingAchieveAll'
  | 'billingPendingAll'
  | 'billingPct'
  | 'videoTotalNetworks'
  | 'totalVideos'
  | 'pendingCurrentNetwork'
  | 'barcTotal'
  | 'selectedWeekBox'
  | 'selectedWeekVideos'
  | 'selectedWeekBarc';

const NON_FIELD_OPS = new Set([
  'SHUTDOWN',
  'ON HOLD',
  'MAHESH MISAL',
  'TEJAS-TELEPHONE',
]);

const WEEK_INDEX_TO_FILTER: Record<number, Exclude<WeekFilter, 'ALL'>> = {
  0: 40,
  1: 41,
  2: 42,
  3: 43,
  4: 44,
};

export function DashboardSnapshotView({
  snapshot,
  baselineTotals,
  baselineOperators,
  selectedWeek,
  onSelectWeek,
  onSwitchToOct,
  sectionFocus = 'overview',
}: DashboardSnapshotViewProps) {
  const [search, setSearch] = useState('');
  const [rosterScope, setRosterScope] = useState<'all' | 'field' | 'special'>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [marketSort, setMarketSort] = useState<'count' | 'pct'>('count');
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<OpSortKey>(
    sectionFocus === 'billing' ? 'billingPendingAll' : 'billingAchieveAll',
  );
  const [sortAsc, setSortAsc] = useState(false);

  const wkIdx = getWeekIndex(selectedWeek);
  const totals = snapshot.totals;

  const baselineByOp = useMemo(() => {
    const map = new Map<string, DashboardOperatorSummary>();
    for (const op of baselineOperators) {
      map.set(op.operationName, op);
    }
    return map;
  }, [baselineOperators]);

  const marketStats = useMemo(() => {
    const map = new Map<
      string,
      {
        market: string;
        operators: string[];
        allTotal: number;
        online: number;
        catATotal: number;
        billingDone: number;
        billingPending: number;
        videoRoster: number;
        totalVideos: number;
        selectedWeekBox: number;
        selectedWeekVideos: number;
      }
    >();

    for (const op of snapshot.operators) {
      const mKey = op.markets.trim();
      if (!mKey) continue;
      let entry = map.get(mKey);
      if (!entry) {
        entry = {
          market: mKey,
          operators: [],
          allTotal: 0,
          online: 0,
          catATotal: 0,
          billingDone: 0,
          billingPending: 0,
          videoRoster: 0,
          totalVideos: 0,
          selectedWeekBox: 0,
          selectedWeekVideos: 0,
        };
        map.set(mKey, entry);
      }
      entry.operators.push(op.operationName);
      entry.allTotal += op.allTotal;
      entry.online += op.allOnline;
      entry.catATotal += op.catATotal;
      entry.billingDone += op.billingAchieveAll;
      entry.billingPending += op.billingPendingAll;
      entry.videoRoster += op.videoTotalNetworks;
      entry.totalVideos += op.videoWeeks.reduce((s, v) => s + v, 0);
      if (wkIdx !== null) {
        entry.selectedWeekBox += op.allWeeks[wkIdx] ?? 0;
        entry.selectedWeekVideos += op.videoWeeks[wkIdx] ?? 0;
      }
    }

    const totalAchieved = Array.from(map.values()).reduce(
      (s, m) => s + m.allTotal,
      0,
    );

    const list = Array.from(map.values()).map((m) => {
      const sharePct =
        totalAchieved > 0
          ? Math.round((m.allTotal / totalAchieved) * 1000) / 10
          : 0;
      const donePct =
        wkIdx !== null
          ? m.allTotal > 0
            ? Math.round((m.selectedWeekVideos / m.allTotal) * 100)
            : 0
          : m.allTotal > 0
            ? Math.round((m.billingDone / m.allTotal) * 100)
            : 0;
      return { ...m, sharePct, donePct };
    });

    if (marketSort === 'pct') {
      list.sort((a, b) => b.donePct - a.donePct || b.allTotal - a.allTotal);
    } else {
      list.sort((a, b) => b.allTotal - a.allTotal);
    }
    return list;
  }, [snapshot.operators, wkIdx, marketSort]);

  const filteredOperators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.operators.filter((op) => {
      const isSpecial = NON_FIELD_OPS.has(op.operationName);
      if (rosterScope === 'field' && isSpecial) return false;
      if (rosterScope === 'special' && !isSpecial) return false;
      if (selectedMarket !== 'ALL' && op.markets.trim() !== selectedMarket) {
        return false;
      }
      if (q) {
        const hay = `${op.operationName} ${op.markets}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [snapshot.operators, search, rosterScope, selectedMarket]);

  const effectiveSortKey: OpSortKey = useMemo(() => {
    if (wkIdx !== null && sortKey === 'billingAchieveAll') {
      return 'selectedWeekVideos';
    }
    if (wkIdx === null && sortKey.startsWith('selectedWeek')) {
      return 'billingAchieveAll';
    }
    return sortKey;
  }, [wkIdx, sortKey]);

  const sortedOperators = useMemo(() => {
    const getSortVal = (op: DashboardOperatorSummary, key: OpSortKey): number | string => {
      switch (key) {
        case 'operationName':
          return op.operationName;
        case 'billingPct':
          return op.allTotal > 0 ? op.billingAchieveAll / op.allTotal : 0;
        case 'totalVideos':
          return op.videoWeeks.reduce((s, v) => s + v, 0);
        case 'selectedWeekBox':
          return wkIdx !== null ? (op.allWeeks[wkIdx] ?? 0) : 0;
        case 'selectedWeekVideos':
          return wkIdx !== null ? (op.videoWeeks[wkIdx] ?? 0) : 0;
        case 'selectedWeekBarc':
          return wkIdx !== null ? (op.barcWeeks[wkIdx] ?? 0) : 0;
        default:
          return op[key];
      }
    };

    const list = [...filteredOperators];
    list.sort((a, b) => {
      const va = getSortVal(a, effectiveSortKey);
      const vb = getSortVal(b, effectiveSortKey);
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return list;
  }, [filteredOperators, effectiveSortKey, sortAsc, wkIdx]);

  const toggleSort = (key: OpSortKey) => {
    if (effectiveSortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (!totals) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-600">
        No dashboard summary totals found in {snapshot.sourceName}.
      </div>
    );
  }

  const totalVideosAllWeeks = totals.videoWeeks.reduce((s, v) => s + v, 0);
  const octVideosW1toW3 = baselineTotals
    ? (baselineTotals.videoWeeks[0] ?? 0) +
      (baselineTotals.videoWeeks[1] ?? 0) +
      (baselineTotals.videoWeeks[2] ?? 0)
    : 0;
  const octVideosAll = baselineTotals
    ? baselineTotals.videoWeeks.reduce((s, v) => s + v, 0)
    : 0;

  const billingDonePct =
    totals.allAchieve > 0
      ? Math.round((totals.billingAchieveAll / totals.allAchieve) * 1000) / 10
      : 0;
  const billingPendingPct =
    totals.allAchieve > 0
      ? Math.round((totals.billingPendingAll / totals.allAchieve) * 1000) / 10
      : 0;
  const onlinePct =
    totals.allAchieve > 0
      ? Math.round((totals.allOnline / totals.allAchieve) * 1000) / 10
      : 0;

  const weekLabel = wkIdx !== null ? `W${wkIdx + 1}` : null;
  const weekAllBox = wkIdx !== null ? (totals.allWeeks[wkIdx] ?? 0) : totals.allAchieve;
  const weekCatABox = wkIdx !== null ? (totals.catAWeeks[wkIdx] ?? 0) : totals.catAAchieve;
  const weekVideos = wkIdx !== null ? (totals.videoWeeks[wkIdx] ?? 0) : totalVideosAllWeeks;
  const weekBarc = wkIdx !== null ? (totals.barcWeeks[wkIdx] ?? 0) : totals.barcAchieve;

  const octWeekAllBox =
    wkIdx !== null && baselineTotals ? (baselineTotals.allWeeks[wkIdx] ?? 0) : baselineTotals?.allAchieve ?? 0;
  const octWeekVideos =
    wkIdx !== null && baselineTotals ? (baselineTotals.videoWeeks[wkIdx] ?? 0) : octVideosW1toW3;

  const weeklyChartRows = [0, 1, 2, 3, 4].map((idx) => ({
    idx,
    label: `W${idx + 1}`,
    allBox: totals.allWeeks[idx] ?? 0,
    catABox: totals.catAWeeks[idx] ?? 0,
    videos: totals.videoWeeks[idx] ?? 0,
    barc: totals.barcWeeks[idx] ?? 0,
    octVideos: baselineTotals?.videoWeeks[idx] ?? 0,
  }));

  const maxWeeklyChart = Math.max(
    1,
    ...weeklyChartRows.flatMap((w) => [w.allBox, w.catABox, w.videos, w.barc]),
  );

  const hasLocalFilter =
    search.trim() !== '' || rosterScope !== 'all' || selectedMarket !== 'ALL';

  const resetLocalFilters = () => {
    setSearch('');
    setRosterScope('all');
    setSelectedMarket('ALL');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search operator or state/market..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div
            className="inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200"
            role="group"
            aria-label="Filter operator roster type"
          >
            {(
              [
                { id: 'all', label: `All (${snapshot.operators.length})` },
                { id: 'field', label: 'Field Ops' },
                { id: 'special', label: 'Shutdown / Hold / Other' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRosterScope(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  rosterScope === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedMarket !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedMarket('ALL')}
              className="h-7 px-2.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Market: {selectedMarket} ×
            </button>
          )}

          {hasLocalFilter && (
            <button
              type="button"
              onClick={resetLocalFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono tabular-nums text-slate-500">
            Showing <strong className="text-slate-900">{sortedOperators.length}</strong> /{' '}
            {snapshot.operators.length} rows · Cycle{' '}
            <strong className="text-emerald-700">W1–{snapshot.activeWeekHint}</strong>
          </span>
          {onSwitchToOct && (
            <button
              type="button"
              onClick={onSwitchToOct}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Oct 2026 Full Master <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{weekLabel ? `${weekLabel} Box Achieved` : 'All Category Achieved'}</span>
            <Radio className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {formatNumber(weekAllBox)}
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-700">
              {weekLabel
                ? `of ${formatNumber(totals.allAchieve)} (${Math.round((weekAllBox / Math.max(1, totals.allAchieve)) * 100)}%)`
                : `${onlinePct}% online`}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {totals.allOnline} Online · {totals.allOffline} Offline
            {baselineTotals ? ` · Oct: ${formatNumber(octWeekAllBox)}` : ''}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{weekLabel ? `${weekLabel} Category A Box` : 'As Per Billing Done'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {formatNumber(weekLabel ? weekCatABox : totals.billingAchieveAll)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {weekLabel
                ? `of ${formatNumber(totals.catAAchieve)} Cat A`
                : `/ ${formatNumber(totals.allAchieve)} (${billingDonePct}%)`}
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-700 font-mono tabular-nums">
            {weekLabel
              ? `${formatNumber(totals.billingAchieveAll)} cycle billing done · ${formatNumber(totals.billingPendingAll)} pending`
              : `${formatNumber(totals.billingPendingAll)} pending (${billingPendingPct}%) · Oct done: ${baselineTotals?.billingAchieveAll ?? '—'}`}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>
              {weekLabel ? `${weekLabel} Videos Submitted` : 'Videos Achieved (W1–W3)'}
            </span>
            <Film className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {formatNumber(weekVideos)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              / {formatNumber(totals.videoTotalNetworks)} roster
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {formatNumber(totals.pendingCurrentNetwork)} pending current · Oct{' '}
            {weekLabel ?? 'W1–W3'}: {formatNumber(octWeekVideos)}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{weekLabel ? `${weekLabel} BARC Videos` : 'BARC Network Coverage'}</span>
            <IndianRupee className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {formatNumber(weekBarc)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {weekLabel
                ? `BARC active in ${weekLabel}`
                : `(${totals.barcOnline} ON · ${totals.barcOffline} OFF)`}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Est. video payout @ ₹15: ₹{formatNumber(weekVideos * 15)} · Cat A: {totals.catAAchieve}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                November 2026 Weekly Attainment (W1 – W5)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                W1–W3 active data recorded; click any week column to focus the dashboard
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-800 rounded-xs inline-block" />
                All Box
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs inline-block" />
                Cat A
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs inline-block" />
                Videos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs inline-block" />
                BARC
              </span>
            </div>
          </div>

          <div className="relative h-60 w-full select-none">
            <svg
              viewBox="0 0 600 220"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="November 2026 weekly attainment bar chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = 180 - tick * 150;
                const val = Math.round(tick * maxWeeklyChart);
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

              {weeklyChartRows.map((wk, idx) => {
                const groupX = 64 + idx * 104;
                const barW = 16;
                const allH = (wk.allBox / maxWeeklyChart) * 150;
                const catAH = (wk.catABox / maxWeeklyChart) * 150;
                const vidH = (wk.videos / maxWeeklyChart) * 150;
                const barcH = (wk.barc / maxWeeklyChart) * 150;
                const isHovered = hoveredWeek === idx;
                const weekVal = WEEK_INDEX_TO_FILTER[idx];
                const isSelected = selectedWeek === weekVal;
                const isDimmed = wkIdx !== null && !isSelected;

                return (
                  <g
                    key={wk.label}
                    onMouseEnter={() => setHoveredWeek(idx)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    onClick={() => onSelectWeek(isSelected ? 'ALL' : weekVal)}
                    className="cursor-pointer"
                    opacity={isDimmed ? 0.35 : 1}
                  >
                    {(isHovered || isSelected) && (
                      <rect
                        x={groupX - 8}
                        y={20}
                        width={92}
                        height={165}
                        rx={4}
                        fill={isSelected ? '#EFF6FF' : '#F1F5F9'}
                        stroke={isSelected ? '#BFDBFE' : undefined}
                      />
                    )}
                    <rect
                      x={groupX}
                      y={180 - allH}
                      width={barW}
                      height={Math.max(allH, wk.allBox > 0 ? 2 : 0)}
                      rx={2}
                      fill="#1E293B"
                    />
                    <rect
                      x={groupX + barW + 3}
                      y={180 - catAH}
                      width={barW}
                      height={Math.max(catAH, wk.catABox > 0 ? 2 : 0)}
                      rx={2}
                      fill="#6366F1"
                    />
                    <rect
                      x={groupX + (barW + 3) * 2}
                      y={180 - vidH}
                      width={barW}
                      height={Math.max(vidH, wk.videos > 0 ? 2 : 0)}
                      rx={2}
                      fill="#2563EB"
                    />
                    <rect
                      x={groupX + (barW + 3) * 3}
                      y={180 - barcH}
                      width={barW}
                      height={Math.max(barcH, wk.barc > 0 ? 2 : 0)}
                      rx={2}
                      fill="#16A34A"
                    />
                    <text
                      x={groupX + 36}
                      y={198}
                      textAnchor="middle"
                      className={`text-[11px] font-semibold font-mono ${
                        isSelected ? 'fill-blue-700' : 'fill-slate-800'
                      }`}
                    >
                      {wk.label}
                    </text>
                    <text
                      x={groupX + 36}
                      y={212}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {idx < 3 ? `${wk.allBox}b · ${wk.videos}v` : 'Upcoming'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hoveredWeek !== null && weeklyChartRows[hoveredWeek] && (
              <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs rounded-md px-3 py-2 shadow-lg pointer-events-none font-mono tabular-nums space-y-0.5">
                <div className="font-semibold text-slate-100">
                  Nov {weeklyChartRows[hoveredWeek].label}
                </div>
                <div>All Cat Box: {weeklyChartRows[hoveredWeek].allBox}</div>
                <div>Cat A Box: {weeklyChartRows[hoveredWeek].catABox}</div>
                <div>Videos: {weeklyChartRows[hoveredWeek].videos}</div>
                <div>BARC: {weeklyChartRows[hoveredWeek].barc}</div>
                {baselineTotals && (
                  <div className="text-slate-400 pt-0.5 border-t border-slate-700">
                    Oct {weeklyChartRows[hoveredWeek].label} Videos:{' '}
                    {weeklyChartRows[hoveredWeek].octVideos}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              November Billing & Category Mix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Billing attainment across {formatNumber(totals.allAchieve)} achieved networks
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-emerald-800">
                    Billing Done (Cat A {totals.billingAchieveA} · B {totals.billingAchieveB} · Oth{' '}
                    {totals.billingAchieveOthers})
                  </span>
                  <span className="font-mono tabular-nums text-emerald-700 font-semibold">
                    {totals.billingAchieveAll} ({billingDonePct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${billingDonePct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-amber-800">
                    Billing Pending (Cat A {totals.billingPendingA} · B/Oth{' '}
                    {totals.billingPendingBO})
                  </span>
                  <span className="font-mono tabular-nums text-amber-700 font-semibold">
                    {totals.billingPendingAll} ({billingPendingPct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${billingPendingPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
              <div className="text-xs font-medium text-slate-600">
                Roster & Network Status ({formatNumber(totals.videoTotalNetworks)} Total)
              </div>
              {[
                {
                  label: 'Category A Networks',
                  count: totals.catAAchieve,
                  sub: `${totals.catAOnline} ON · ${totals.catAOffline} OFF`,
                  pct: Math.round((totals.catAAchieve / Math.max(1, totals.allAchieve)) * 100),
                  color: 'bg-indigo-600',
                },
                {
                  label: 'BARC Networks',
                  count: totals.barcAchieve,
                  sub: `${totals.barcOnline} ON · ${totals.barcOffline} OFF`,
                  pct: Math.round((totals.barcAchieve / Math.max(1, totals.allAchieve)) * 100),
                  color: 'bg-blue-600',
                },
                {
                  label: 'Pending Current Network',
                  count: totals.pendingCurrentNetwork,
                  sub: `${totalVideosAllWeeks} W1–W3 videos recorded`,
                  pct: Math.round(
                    (totals.pendingCurrentNetwork / Math.max(1, totals.videoTotalNetworks)) * 100,
                  ),
                  color: 'bg-slate-500',
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-800">{item.label}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {formatNumber(item.count)} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${Math.min(100, item.pct)}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Top Markets / States ({marketStats.length} Regions)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {weekLabel
                  ? `${weekLabel} video attainment % by market · click any row to filter operators`
                  : 'Billing done % & network share · click any row to filter operators'}
              </p>
            </div>
            <div
              className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0"
              role="group"
              aria-label="Sort top markets"
            >
              <button
                type="button"
                onClick={() => setMarketSort('count')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                  marketSort === 'count'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Count
              </button>
              <button
                type="button"
                onClick={() => setMarketSort('pct')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                  marketSort === 'pct'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Done %
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0">
            {marketStats.map((st) => {
              const active = selectedMarket === st.market;
              const completed = wkIdx !== null ? st.selectedWeekVideos : st.billingDone;
              return (
                <button
                  key={st.market}
                  type="button"
                  onClick={() => setSelectedMarket(active ? 'ALL' : st.market)}
                  className={`w-full py-2 px-2 rounded text-xs text-left cursor-pointer transition-colors space-y-1 ${
                    active
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {st.market}{' '}
                      <span className="text-[11px] font-mono font-normal text-slate-400">
                        ({st.sharePct}% · {st.operators.join(', ')})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 shrink-0">
                      {completed}/{st.allTotal}{' '}
                      <strong
                        className={
                          st.donePct >= 50
                            ? 'text-emerald-700'
                            : st.donePct >= 25
                              ? 'text-amber-700'
                              : 'text-slate-600'
                        }
                      >
                        {st.donePct}%
                      </strong>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        active
                          ? 'bg-blue-600'
                          : st.donePct >= 50
                            ? 'bg-emerald-600'
                            : st.donePct >= 25
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, st.donePct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Oct → Nov 2026 Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              November active W1–W3 pace against October full workbook
            </p>

            {baselineTotals ? (
              <div className="mt-4 divide-y divide-slate-100 text-xs">
                {[
                  {
                    label: 'All Category Achieved',
                    oct: baselineTotals.allAchieve,
                    nov: totals.allAchieve,
                  },
                  {
                    label: 'Online / Offline',
                    oct: baselineTotals.allOnline,
                    nov: totals.allOnline,
                    suffix: ' ON',
                  },
                  {
                    label: 'Category A Total',
                    oct: baselineTotals.catAAchieve,
                    nov: totals.catAAchieve,
                  },
                  {
                    label: 'Billing Achieved',
                    oct: baselineTotals.billingAchieveAll,
                    nov: totals.billingAchieveAll,
                  },
                  {
                    label: 'Videos (W1–W3 Pace)',
                    oct: octVideosW1toW3,
                    nov: totalVideosAllWeeks,
                  },
                  {
                    label: 'BARC Active Total',
                    oct: baselineTotals.barcAchieve,
                    nov: totals.barcAchieve,
                  },
                  {
                    label: 'Total Video Roster',
                    oct: baselineTotals.videoTotalNetworks,
                    nov: totals.videoTotalNetworks,
                  },
                ].map((row) => {
                  const diff = row.nov - row.oct;
                  return (
                    <div
                      key={row.label}
                      className="py-2 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-600">{row.label}</span>
                      <div className="font-mono tabular-nums text-right">
                        <span className="text-slate-400">{formatNumber(row.oct)}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <span className="font-semibold text-slate-900">
                          {formatNumber(row.nov)}
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
              <div className="mt-4 text-xs text-slate-500">
                October baseline comparison appears when both workbooks are loaded.
              </div>
            )}
          </div>

          {baselineTotals && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
              Oct full cycle total videos: {formatNumber(octVideosAll)} across W1–W5
            </div>
          )}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              November 2026 Operator & Billing Matrix
              {weekLabel ? ` · ${weekLabel} Focus` : ''}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete operator ledger parsed directly from Monthly Video Tracker - November 2026
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {sortedOperators.length} entries
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
                    onClick={() => toggleSort('allTotal')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Achieve <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('allOnline')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    ON · OFF <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('catATotal')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Cat A <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('barcTotal')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    BARC <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                {wkIdx !== null ? (
                  <>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('selectedWeekBox')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        {weekLabel} Box <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('selectedWeekVideos')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        {weekLabel} Vid <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('selectedWeekBarc')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                      >
                        {weekLabel} BARC <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </>
                ) : (
                  <th className="py-2.5 px-3 text-right font-medium">
                    W1 · W2 · W3 Vid
                  </th>
                )}
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('billingAchieveAll')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Billing Done <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('billingPendingAll')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Pending <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort('pendingCurrentNetwork')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                  >
                    Roster / Cur. Pend <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedOperators.map((op) => {
                const billPct =
                  op.allTotal > 0
                    ? Math.round((op.billingAchieveAll / op.allTotal) * 100)
                    : 0;
                const octOp = baselineByOp.get(op.operationName);
                const billDiff = octOp
                  ? op.billingAchieveAll - octOp.billingAchieveAll
                  : null;
                return (
                  <tr
                    key={op.operationName}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {op.operationName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {op.markets || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                      {op.allTotal}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span className="text-emerald-700">{op.allOnline}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-amber-700">{op.allOffline}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-700">
                      {op.catATotal}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {op.barcTotal}
                    </td>
                    {wkIdx !== null ? (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                          {op.allWeeks[wkIdx] ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                          {op.videoWeeks[wkIdx] ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                          {op.barcWeeks[wkIdx] ?? 0}
                        </td>
                      </>
                    ) : (
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {op.videoWeeks.slice(0, 3).join(' · ')}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-emerald-700">
                        {op.billingAchieveAll}
                      </span>{' '}
                      <span className="text-slate-400">({billPct}%)</span>
                      {sectionFocus === 'billing' && billDiff !== null && (
                        <span
                          className={`ml-1 text-[11px] ${
                            billDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          [{billDiff >= 0 ? `+${billDiff}` : billDiff} vs Oct]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                      {op.billingPendingAll}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {op.videoTotalNetworks} /{' '}
                      <span className="text-slate-900 font-medium">
                        {op.pendingCurrentNetwork}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-xs">
              <tr>
                <td className="py-2.5 px-4 text-slate-900">TOTAL ACHIEVE</td>
                <td className="py-2.5 px-3 text-slate-500 font-mono">All Regions</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                  {totals.allAchieve}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                  <span className="text-emerald-700">{totals.allOnline}</span>
                  <span className="text-slate-300 mx-1">/</span>
                  <span className="text-amber-700">{totals.allOffline}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-700">
                  {totals.catAAchieve}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                  {totals.barcAchieve}
                </td>
                {wkIdx !== null ? (
                  <>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {weekAllBox}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-700">
                      {weekVideos}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {weekBarc}
                    </td>
                  </>
                ) : (
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {totals.videoWeeks.slice(0, 3).join(' · ')}
                  </td>
                )}
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                  {totals.billingAchieveAll} ({Math.round(billingDonePct)}%)
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                  {totals.billingPendingAll}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                  {totals.videoTotalNetworks} / {totals.pendingCurrentNetwork}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
