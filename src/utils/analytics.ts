import type {
  MasterNetworkRecord,
  MonthScope,
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
  weekNumber: number;
  shortLabel: string;
  wkLabel: string;
  rangeLabel: string;
}

const OCT_WEEK_OPTIONS: WeekMeta[] = [
  { value: 1, index: 0, weekNumber: 40, shortLabel: 'W1', wkLabel: 'WK40', rangeLabel: 'Sep 28 – Oct 4' },
  { value: 2, index: 1, weekNumber: 41, shortLabel: 'W2', wkLabel: 'WK41', rangeLabel: 'Oct 5 – Oct 11' },
  { value: 3, index: 2, weekNumber: 42, shortLabel: 'W3', wkLabel: 'WK42', rangeLabel: 'Oct 12 – Oct 18' },
  { value: 4, index: 3, weekNumber: 43, shortLabel: 'W4', wkLabel: 'WK43', rangeLabel: 'Oct 19 – Oct 25' },
  { value: 5, index: 4, weekNumber: 44, shortLabel: 'W5', wkLabel: 'WK44', rangeLabel: 'Oct 26 – Nov 1' },
];

const NOV_WEEK_OPTIONS: WeekMeta[] = [
  { value: 1, index: 0, weekNumber: 45, shortLabel: 'W1', wkLabel: 'WK45', rangeLabel: 'Nov 2 – Nov 8' },
  { value: 2, index: 1, weekNumber: 46, shortLabel: 'W2', wkLabel: 'WK46', rangeLabel: 'Nov 9 – Nov 15' },
  { value: 3, index: 2, weekNumber: 47, shortLabel: 'W3', wkLabel: 'WK47', rangeLabel: 'Nov 16 – Nov 22' },
  { value: 4, index: 3, weekNumber: 48, shortLabel: 'W4', wkLabel: 'WK48', rangeLabel: 'Nov 23 – Nov 29' },
  { value: 5, index: 4, weekNumber: 49, shortLabel: 'W5', wkLabel: 'WK49', rangeLabel: 'Nov 30 – Dec 6' },
];

export function getWeekOptionsForMonth(monthScope: MonthScope): WeekMeta[] {
  return monthScope === 'nov2026' ? NOV_WEEK_OPTIONS : OCT_WEEK_OPTIONS;
}

export function getWeekIndex(week: WeekFilter): number | null {
  if (week === 'ALL') return null;
  return week - 1;
}

export function getWeekMeta(
  week: WeekFilter,
  monthScope: MonthScope = 'oct2026',
): WeekMeta | null {
  if (week === 'ALL') return null;
  return (
    getWeekOptionsForMonth(monthScope).find((w) => w.value === week) ?? null
  );
}

export function getWeekNumberForDate(
  dateStr: string,
  monthScope: MonthScope = 'oct2026',
): Exclude<WeekFilter, 'ALL'> | null {
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
  if (monthScope === 'nov2026') {
    if (ts >= Date.UTC(2026, 10, 2) && ts <= Date.UTC(2026, 10, 8)) return 1;
    if (ts >= Date.UTC(2026, 10, 9) && ts <= Date.UTC(2026, 10, 15)) return 2;
    if (ts >= Date.UTC(2026, 10, 16) && ts <= Date.UTC(2026, 10, 22)) return 3;
    if (ts >= Date.UTC(2026, 10, 23) && ts <= Date.UTC(2026, 10, 29)) return 4;
    if (ts >= Date.UTC(2026, 10, 30) && ts <= Date.UTC(2026, 11, 6)) return 5;
    return null;
  }

  if (ts >= Date.UTC(2026, 8, 28) && ts <= Date.UTC(2026, 9, 4)) return 1;
  if (ts >= Date.UTC(2026, 9, 5) && ts <= Date.UTC(2026, 9, 11)) return 2;
  if (ts >= Date.UTC(2026, 9, 12) && ts <= Date.UTC(2026, 9, 18)) return 3;
  if (ts >= Date.UTC(2026, 9, 19) && ts <= Date.UTC(2026, 9, 25)) return 4;
  if (ts >= Date.UTC(2026, 9, 26) && ts <= Date.UTC(2026, 10, 1)) return 5;
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
  activeAchieveCount: number;
  billingDoneA: number;
  billingDoneB: number;
  billingDoneOthers: number;
  billingPendingActiveAll: number;
  billingPendingActiveA: number;
  billingPendingActiveBO: number;
  catAActiveCount: number;
  catAOnline: number;
  catAOffline: number;
  barcActiveCount: number;
  barcOnline: number;
  barcOffline: number;
  videoPendingCount: number;
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
    weekSlot: Exclude<WeekFilter, 'ALL'>;
    weekNumber: number;
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
    operators: string[];
    total: number;
    online: number;
    billingDone: number;
    payoutINR: number;
    selectedWeekBox: number;
    selectedWeekVideoNetworks: number;
    sharePct: number;
    attainmentPct: number;
  }[];
  exceptionCounts: {
    label: string;
    count: number;
  }[];
}

export function computeOverviewStats(
  records: MasterNetworkRecord[],
  selectedWeek: WeekFilter = 'ALL',
  monthScope: MonthScope = 'oct2026',
): ComputedOverviewStats {
  const wkIdx = getWeekIndex(selectedWeek);
  const weekOptions = getWeekOptionsForMonth(monthScope);

  let onlineCount = 0;
  let offlineCount = 0;
  let shutdownCount = 0;
  let onHoldCount = 0;
  let billingDoneCount = 0;
  let billingPendingCount = 0;
  let activeAchieveCount = 0;
  let billingDoneA = 0;
  let billingDoneB = 0;
  let billingDoneOthers = 0;
  let billingPendingActiveAll = 0;
  let billingPendingActiveA = 0;
  let billingPendingActiveBO = 0;
  let catAActiveCount = 0;
  let catAOnline = 0;
  let catAOffline = 0;
  let barcActiveCount = 0;
  let barcOnline = 0;
  let barcOffline = 0;
  let videoPendingCount = 0;
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

  const weeklyMetrics = weekOptions.map((meta) => ({
    weekSlot: meta.value,
    weekNumber: records[0]?.weeks[meta.index]?.weekNumber ?? meta.weekNumber,
    weekLabel: `WK${records[0]?.weeks[meta.index]?.weekNumber ?? meta.weekNumber}`,
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

    if (rec.asPerBilling === 'DONE') {
      billingDoneCount++;
      if (rec.category === 'CATEGORY A') billingDoneA++;
      else if (rec.category === 'CATEGORY B') billingDoneB++;
      else billingDoneOthers++;
    } else {
      billingPendingCount++;
    }

    const isActiveType = rec.type === 'ONLINE' || rec.type === 'OFFLINE';
    if (isActiveType) {
      activeAchieveCount++;
      if (rec.asPerBilling === 'PENDING') {
        billingPendingActiveAll++;
        if (rec.category === 'CATEGORY A') billingPendingActiveA++;
        else billingPendingActiveBO++;
      }
      if (rec.category === 'CATEGORY A') {
        catAActiveCount++;
        if (rec.type === 'ONLINE') catAOnline++;
        else catAOffline++;
      }
      if (rec.weekUpdate === 'BARC') {
        barcActiveCount++;
        if (rec.type === 'ONLINE') barcOnline++;
        else barcOffline++;
      }
    }

    if (rec.videoStatus === 'YES') videoYesCount++;
    else videoPendingCount++;
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
        operators: [],
        total: 0,
        online: 0,
        billingDone: 0,
        payoutINR: 0,
        selectedWeekBox: 0,
        selectedWeekVideoNetworks: 0,
        sharePct: 0,
        attainmentPct: 0,
      };
      stateMap.set(stKey, stEntry);
    }
    if (rec.operationName && !stEntry.operators.includes(rec.operationName)) {
      stEntry.operators.push(rec.operationName);
    }
    stEntry.total++;
    if (rec.type === 'ONLINE') stEntry.online++;
    if (rec.asPerBilling === 'DONE') stEntry.billingDone++;
    if (wkIdx !== null) {
      const w = rec.weeks[wkIdx];
      if (w) {
        if (w.boxCount > 0) stEntry.selectedWeekBox++;
        if (w.videoCount > 0) stEntry.selectedWeekVideoNetworks++;
      }
    }
    stEntry.payoutINR += wkIdx !== null
      ? (rec.weeks[wkIdx]?.videoCount ?? 0) * payablePerVideo
      : rec.finalAmountToPay;
  }

  const totalRecordCount = records.length;
  for (const st of stateMap.values()) {
    st.sharePct =
      totalRecordCount > 0
        ? Math.round((st.total / totalRecordCount) * 1000) / 10
        : 0;
    const completed =
      wkIdx !== null ? st.selectedWeekVideoNetworks : st.billingDone;
    st.attainmentPct =
      st.total > 0 ? Math.round((completed / st.total) * 100) : 0;
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
    activeAchieveCount,
    billingDoneA,
    billingDoneB,
    billingDoneOthers,
    billingPendingActiveAll,
    billingPendingActiveA,
    billingPendingActiveBO,
    catAActiveCount,
    catAOnline,
    catAOffline,
    barcActiveCount,
    barcOnline,
    barcOffline,
    videoPendingCount,
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
  monthScope: MonthScope = 'oct2026',
  filename?: string,
): void {
  const startWk = records[0]?.weeks[0]?.weekNumber ?? (monthScope === 'nov2026' ? 45 : 40);
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
    `W${startWk} Box`,
    `W${startWk} Videos`,
    `W${startWk + 1} Box`,
    `W${startWk + 1} Videos`,
    `W${startWk + 2} Box`,
    `W${startWk + 2} Videos`,
    `W${startWk + 3} Box`,
    `W${startWk + 3} Videos`,
    `W${startWk + 4} Box`,
    `W${startWk + 4} Videos`,
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

  const resolvedFilename =
    filename ??
    (monthScope === 'nov2026'
      ? 'november-2026-tracker-export.csv'
      : 'october-2026-tracker-export.csv');

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = resolvedFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDashboardSnapshotToCsv(
  snapshot: {
    operators: Array<{
      markets: string;
      operationName: string;
      allTotal: number;
      allOnline: number;
      allOffline: number;
      allWeeks: number[];
      catATotal: number;
      catAOnline: number;
      catAOffline: number;
      billingAchieveAll: number;
      billingAchieveA: number;
      billingAchieveB: number;
      billingAchieveOthers: number;
      billingPendingAll: number;
      billingPendingA: number;
      billingPendingBO: number;
      videoTotalNetworks: number;
      videoWeeks: number[];
      pendingCurrentNetwork: number;
      barcTotal: number;
      barcOnline: number;
      barcOffline: number;
    }>;
  },
  filename = 'dashboard-summary-export.csv',
): void {
  const headers = [
    'Markets',
    'Operation Name',
    'All Total',
    'All Online',
    'All Offline',
    'W1 Box',
    'W2 Box',
    'W3 Box',
    'W4 Box',
    'W5 Box',
    'Cat A Total',
    'Cat A Online',
    'Cat A Offline',
    'Billing Done All',
    'Billing Done Cat A',
    'Billing Done Cat B',
    'Billing Done Others',
    'Billing Pending All',
    'Billing Pending Cat A',
    'Billing Pending Cat B/Others',
    'Video Roster',
    'W1 Videos',
    'W2 Videos',
    'W3 Videos',
    'W4 Videos',
    'W5 Videos',
    'Pending Current Network',
    'BARC Total',
    'BARC Online',
    'BARC Offline',
  ];

  const escapeCell = (v: unknown): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.map(escapeCell).join(',')];
  for (const op of snapshot.operators) {
    const row = [
      op.markets,
      op.operationName,
      op.allTotal,
      op.allOnline,
      op.allOffline,
      op.allWeeks[0] ?? 0,
      op.allWeeks[1] ?? 0,
      op.allWeeks[2] ?? 0,
      op.allWeeks[3] ?? 0,
      op.allWeeks[4] ?? 0,
      op.catATotal,
      op.catAOnline,
      op.catAOffline,
      op.billingAchieveAll,
      op.billingAchieveA,
      op.billingAchieveB,
      op.billingAchieveOthers,
      op.billingPendingAll,
      op.billingPendingA,
      op.billingPendingBO,
      op.videoTotalNetworks,
      op.videoWeeks[0] ?? 0,
      op.videoWeeks[1] ?? 0,
      op.videoWeeks[2] ?? 0,
      op.videoWeeks[3] ?? 0,
      op.videoWeeks[4] ?? 0,
      op.pendingCurrentNetwork,
      op.barcTotal,
      op.barcOnline,
      op.barcOffline,
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
