import type {
  MasterNetworkRecord,
  TrackerFilters,
  WeekFilter,
} from '../types/tracker';

export const DEFAULT_FILTERS: TrackerFilters = {
  week: 'ALL',
  search: '',
  operator: 'ALL',
  state: 'ALL',
  type: 'ALL',
  category: 'ALL',
  program: 'ALL',
  billing: 'ALL',
};

export interface WeekMeta {
  value: Exclude<WeekFilter, 'ALL'>;
  index: number;
  shortLabel: string;
  wkLabel: string;
  rangeLabel: string;
}

export const WEEK_OPTIONS: WeekMeta[] = [
  { value: 40, index: 0, shortLabel: 'W1', wkLabel: 'WK40', rangeLabel: 'Sep 28 – Oct 4' },
  { value: 41, index: 1, shortLabel: 'W2', wkLabel: 'WK41', rangeLabel: 'Oct 5 – Oct 11' },
  { value: 42, index: 2, shortLabel: 'W3', wkLabel: 'WK42', rangeLabel: 'Oct 12 – Oct 18' },
  { value: 43, index: 3, shortLabel: 'W4', wkLabel: 'WK43', rangeLabel: 'Oct 19 – Oct 25' },
  { value: 44, index: 4, shortLabel: 'W5', wkLabel: 'WK44', rangeLabel: 'Oct 26 – Nov 1' },
];

export function getWeekIndex(week: WeekFilter): number | null {
  if (week === 'ALL') return null;
  return week - 40;
}

export function getWeekMeta(week: WeekFilter): WeekMeta | null {
  if (week === 'ALL') return null;
  return WEEK_OPTIONS.find((w) => w.value === week) ?? null;
}

export function getWeekNumberForDate(dateStr: string): Exclude<WeekFilter, 'ALL'> | null {
  const clean = dateStr.trim();
  const parts = clean.split('/');
  if (parts.length !== 3) return null;
  const p0 = Number(parts[0]);
  const p1 = Number(parts[1]);
  const year = Number(parts[2]);
  if (!Number.isFinite(p0) || !Number.isFinite(p1) || !Number.isFinite(year)) {
    return null;
  }

  let month = p0;
  let day = p1;
  if (p0 > 12) {
    day = p0;
    month = p1;
  }

  const ts = Date.UTC(year, month - 1, day);
  if (ts >= Date.UTC(2026, 8, 28) && ts <= Date.UTC(2026, 9, 4)) return 40;
  if (ts >= Date.UTC(2026, 9, 5) && ts <= Date.UTC(2026, 9, 11)) return 41;
  if (ts >= Date.UTC(2026, 9, 12) && ts <= Date.UTC(2026, 9, 18)) return 42;
  if (ts >= Date.UTC(2026, 9, 19) && ts <= Date.UTC(2026, 9, 25)) return 43;
  if (ts >= Date.UTC(2026, 9, 26) && ts <= Date.UTC(2026, 10, 1)) return 44;
  return null;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

export function formatCurrencyINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function filterMasterRecords(
  records: MasterNetworkRecord[],
  filters: TrackerFilters,
): MasterNetworkRecord[] {
  const q = filters.search.trim().toLowerCase();

  return records.filter((rec) => {
    if (filters.operator !== 'ALL' && rec.operationName !== filters.operator) {
      return false;
    }
    if (filters.state !== 'ALL' && rec.state !== filters.state) {
      return false;
    }
    if (filters.type !== 'ALL' && rec.type !== filters.type) {
      return false;
    }
    if (filters.category !== 'ALL' && rec.category !== filters.category) {
      return false;
    }
    if (filters.program !== 'ALL' && rec.weekUpdate !== filters.program) {
      return false;
    }
    if (filters.billing !== 'ALL' && rec.asPerBilling !== filters.billing) {
      return false;
    }
    if (q) {
      const hay =
        `${rec.sr} ${rec.code} ${rec.networkName} ${rec.city} ${rec.state} ${rec.machineNo} ${rec.operationName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface ComputedOverviewStats {
  totalNetworks: number;
  onlineCount: number;
  offlineCount: number;
  shutdownCount: number;
  onHoldCount: number;
  billingDoneCount: number;
  billingPendingCount: number;
  videoYesCount: number;
  boxYesCount: number;
  totalReportedLandings: number;
  totalBoxWeeks: number;
  totalVideosVerified: number;
  totalPayoutINR: number;
  barcCount: number;
  starCount: number;
  othersProgramCount: number;
  catACount: number;
  catBCount: number;
  othersCatCount: number;
  activeWeekBoxNetworks: number;
  activeWeekVideos: number;
  activeWeekBarcVideos: number;
  activeWeekEstPayoutINR: number;
  activeWeekPendingVideos: number;
  weeklyMetrics: {
    weekNumber: Exclude<WeekFilter, 'ALL'>;
    weekLabel: string;
    shortLabel: string;
    rangeLabel: string;
    boxOnlineNetworks: number;
    videosSubmitted: number;
    barcVideos: number;
    starNetworks: number;
  }[];
  dailyHeatmap: {
    date: string;
    dayName: string;
    onCount: number;
    weekIndex: number;
  }[];
  operatorStats: {
    operationName: string;
    total: number;
    online: number;
    offline: number;
    shutdownOrHold: number;
    billingDone: number;
    billingPending: number;
    videoDone: number;
    boxYes: number;
    totalVideos: number;
    payoutINR: number;
    barcCount: number;
    weeklyVideos: number[];
    weeklyBoxActive: number[];
    weeklyBarc: number[];
    selectedWeekBox: number;
    selectedWeekVideos: number;
    selectedWeekBarc: number;
    selectedWeekPayoutINR: number;
  }[];
  stateStats: {
    state: string;
    total: number;
    online: number;
    billingDone: number;
    payoutINR: number;
  }[];
  exceptionCounts: {
    label: string;
    count: number;
  }[];
}

export function computeOverviewStats(
  records: MasterNetworkRecord[],
  selectedWeek: WeekFilter = 'ALL',
): ComputedOverviewStats {
  const wkIdx = getWeekIndex(selectedWeek);

  let onlineCount = 0;
  let offlineCount = 0;
  let shutdownCount = 0;
  let onHoldCount = 0;
  let billingDoneCount = 0;
  let billingPendingCount = 0;
  let videoYesCount = 0;
  let boxYesCount = 0;
  let totalReportedLandings = 0;
  let totalBoxWeeks = 0;
  let totalVideosVerified = 0;
  let totalPayoutINR = 0;
  let barcCount = 0;
  let starCount = 0;
  let othersProgramCount = 0;
  let catACount = 0;
  let catBCount = 0;
  let othersCatCount = 0;

  let activeWeekBoxNetworks = 0;
  let activeWeekVideos = 0;
  let activeWeekBarcVideos = 0;
  let activeWeekEstPayoutINR = 0;
  let activeWeekPendingVideos = 0;

  const weeklyMetrics = WEEK_OPTIONS.map((meta) => ({
    weekNumber: meta.value,
    weekLabel: meta.wkLabel,
    shortLabel: meta.shortLabel,
    rangeLabel: records[0]?.weeks[meta.index]?.rangeLabel ?? meta.rangeLabel,
    boxOnlineNetworks: 0,
    videosSubmitted: 0,
    barcVideos: 0,
    starNetworks: 0,
  }));

  const dailyLen = records[0]?.daily.length ?? 0;
  const dailyHeatmap = Array.from({ length: dailyLen }, (_, idx) => ({
    date: records[0]?.daily[idx]?.date ?? '',
    dayName: records[0]?.daily[idx]?.dayName ?? '',
    onCount: 0,
    weekIndex: Math.floor(idx / 7),
  }));

  const opMap = new Map<
    string,
    ComputedOverviewStats['operatorStats'][number]
  >();
  const stateMap = new Map<
    string,
    ComputedOverviewStats['stateStats'][number]
  >();
  const remarkMap = new Map<string, number>();

  for (const rec of records) {
    if (rec.type === 'ONLINE') onlineCount++;
    else if (rec.type === 'OFFLINE') offlineCount++;
    else if (rec.type === 'SHUTDOWN') shutdownCount++;
    else onHoldCount++;

    if (rec.asPerBilling === 'DONE') billingDoneCount++;
    else billingPendingCount++;

    if (rec.videoStatus === 'YES') videoYesCount++;
    if (rec.boxStatus === 'YES') boxYesCount++;

    if (rec.weekUpdate === 'BARC') barcCount++;
    else if (rec.weekUpdate === 'STAR') starCount++;
    else othersProgramCount++;

    if (rec.category === 'CATEGORY A') catACount++;
    else if (rec.category === 'CATEGORY B') catBCount++;
    else othersCatCount++;

    totalReportedLandings += rec.totalReported;
    totalBoxWeeks += rec.boxCount;
    totalVideosVerified += rec.videoPayment;
    totalPayoutINR += rec.finalAmountToPay;

    const payablePerVideo = rec.budget > 0 ? rec.budget : 0;

    if (wkIdx !== null) {
      const w = rec.weeks[wkIdx];
      if (w) {
        if (w.boxCount > 0) activeWeekBoxNetworks++;
        if (w.videoCount > 0) {
          activeWeekVideos += w.videoCount;
          activeWeekEstPayoutINR += w.videoCount * payablePerVideo;
        } else {
          activeWeekPendingVideos++;
        }
        if (w.barcFlag > 0) activeWeekBarcVideos++;
      }
    }

    rec.weeks.forEach((w, idx) => {
      if (w.boxCount > 0) weeklyMetrics[idx].boxOnlineNetworks++;
      if (w.videoCount > 0) weeklyMetrics[idx].videosSubmitted += w.videoCount;
      if (w.barcFlag > 0) weeklyMetrics[idx].barcVideos++;
      if (w.starFlag > 0) weeklyMetrics[idx].starNetworks++;

      if (wkIdx === null || wkIdx === idx) {
        if (w.remark) {
          const key = w.remark.toUpperCase();
          remarkMap.set(key, (remarkMap.get(key) ?? 0) + 1);
        }
        if (w.weekRemark) {
          const key = w.weekRemark.toUpperCase();
          remarkMap.set(key, (remarkMap.get(key) ?? 0) + 1);
        }
      }
    });

    rec.daily.forEach((d, idx) => {
      if (d.on && dailyHeatmap[idx]) {
        dailyHeatmap[idx].onCount++;
      }
    });

    const opKey = rec.operationName || 'UNASSIGNED';
    let opEntry = opMap.get(opKey);
    if (!opEntry) {
      opEntry = {
        operationName: opKey,
        total: 0,
        online: 0,
        offline: 0,
        shutdownOrHold: 0,
        billingDone: 0,
        billingPending: 0,
        videoDone: 0,
        boxYes: 0,
        totalVideos: 0,
        payoutINR: 0,
        barcCount: 0,
        weeklyVideos: [0, 0, 0, 0, 0],
        weeklyBoxActive: [0, 0, 0, 0, 0],
        weeklyBarc: [0, 0, 0, 0, 0],
        selectedWeekBox: 0,
        selectedWeekVideos: 0,
        selectedWeekBarc: 0,
        selectedWeekPayoutINR: 0,
      };
      opMap.set(opKey, opEntry);
    }
    opEntry.total++;
    if (rec.type === 'ONLINE') opEntry.online++;
    else if (rec.type === 'OFFLINE') opEntry.offline++;
    else opEntry.shutdownOrHold++;
    if (rec.asPerBilling === 'DONE') opEntry.billingDone++;
    else opEntry.billingPending++;
    if (rec.videoStatus === 'YES') opEntry.videoDone++;
    if (rec.boxStatus === 'YES') opEntry.boxYes++;
    opEntry.totalVideos += rec.videoPayment;
    opEntry.payoutINR += rec.finalAmountToPay;
    if (rec.weekUpdate === 'BARC') opEntry.barcCount++;
    rec.weeks.forEach((w, idx) => {
      if (w.videoCount > 0) opEntry!.weeklyVideos[idx] += w.videoCount;
      if (w.boxCount > 0) opEntry!.weeklyBoxActive[idx] += 1;
      if (w.barcFlag > 0) opEntry!.weeklyBarc[idx] += 1;
    });
    if (wkIdx !== null) {
      const w = rec.weeks[wkIdx];
      if (w) {
        if (w.boxCount > 0) opEntry.selectedWeekBox += 1;
        if (w.videoCount > 0) {
          opEntry.selectedWeekVideos += w.videoCount;
          opEntry.selectedWeekPayoutINR += w.videoCount * payablePerVideo;
        }
        if (w.barcFlag > 0) opEntry.selectedWeekBarc += 1;
      }
    }

    const stKey = rec.state || 'UNKNOWN';
    let stEntry = stateMap.get(stKey);
    if (!stEntry) {
      stEntry = {
        state: stKey,
        total: 0,
        online: 0,
        billingDone: 0,
        payoutINR: 0,
      };
      stateMap.set(stKey, stEntry);
    }
    stEntry.total++;
    if (rec.type === 'ONLINE') stEntry.online++;
    if (rec.asPerBilling === 'DONE') stEntry.billingDone++;
    stEntry.payoutINR += wkIdx !== null
      ? (rec.weeks[wkIdx]?.videoCount ?? 0) * payablePerVideo
      : rec.finalAmountToPay;
  }

  const operatorStats = Array.from(opMap.values()).sort((a, b) =>
    wkIdx !== null
      ? b.selectedWeekVideos - a.selectedWeekVideos || b.total - a.total
      : b.billingDone - a.billingDone || b.total - a.total,
  );
  const stateStats = Array.from(stateMap.values()).sort(
    (a, b) => b.total - a.total,
  );
  const exceptionCounts = Array.from(remarkMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    totalNetworks: records.length,
    onlineCount,
    offlineCount,
    shutdownCount,
    onHoldCount,
    billingDoneCount,
    billingPendingCount,
    videoYesCount,
    boxYesCount,
    totalReportedLandings,
    totalBoxWeeks,
    totalVideosVerified,
    totalPayoutINR,
    barcCount,
    starCount,
    othersProgramCount,
    catACount,
    catBCount,
    othersCatCount,
    activeWeekBoxNetworks,
    activeWeekVideos,
    activeWeekBarcVideos,
    activeWeekEstPayoutINR,
    activeWeekPendingVideos,
    weeklyMetrics,
    dailyHeatmap,
    operatorStats,
    stateStats,
    exceptionCounts,
  };
}

export function exportRecordsToCsv(
  records: MasterNetworkRecord[],
  filename = 'network-tracker-export.csv',
): void {
  const headers = [
    'SR',
    'CODE',
    'STATE',
    'CITY',
    'NETWORK NAME',
    'TYPE',
    'CATEGORY',
    'WEEK UPDATE',
    'MACHINE NO',
    'Operation Name',
    'W40 Box',
    'W40 Videos',
    'W41 Box',
    'W41 Videos',
    'W42 Box',
    'W42 Videos',
    'W43 Box',
    'W43 Videos',
    'W44 Box',
    'W44 Videos',
    'Total Reported',
    'Box Count',
    'Video Payment',
    'Video Billing',
    'Video Status',
    'Box Status',
    'AS PER BILLING',
    'BUDGET',
    'FINAL AMOUNT TO PAY',
  ];

  const escapeCell = (v: unknown): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.map(escapeCell).join(',')];
  for (const r of records) {
    const row = [
      r.sr,
      r.code,
      r.state,
      r.city,
      r.networkName,
      r.type,
      r.category,
      r.weekUpdate,
      r.machineNo,
      r.operationName,
      r.weeks[0]?.boxCount ?? 0,
      r.weeks[0]?.videoCount ?? 0,
      r.weeks[1]?.boxCount ?? 0,
      r.weeks[1]?.videoCount ?? 0,
      r.weeks[2]?.boxCount ?? 0,
      r.weeks[2]?.videoCount ?? 0,
      r.weeks[3]?.boxCount ?? 0,
      r.weeks[3]?.videoCount ?? 0,
      r.weeks[4]?.boxCount ?? 0,
      r.weeks[4]?.videoCount ?? 0,
      r.totalReported,
      r.boxCount,
      r.videoPayment,
      r.videoBilling,
      r.videoStatus,
      r.boxStatus,
      r.asPerBilling,
      r.budgetLabel,
      r.finalAmountToPay,
    ];
    lines.push(row.map(escapeCell).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
