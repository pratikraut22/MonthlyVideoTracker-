import * as XLSX from 'xlsx';
import type {
  BillingStatus,
  DashboardOperatorSummary,
  DthLogEntry,
  MasterNetworkRecord,
  MonthScope,
  MonthWorkbook,
  NetworkCategory,
  NetworkType,
  OperatorPendingRow,
  SonyActivityRow,
  WeekUpdateProgram,
  WorkbookData,
} from '../types/tracker';

const OCT_OPERATOR_SHEETS: Record<string, string> = {
  ARBIND: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-ARBIND_36aa5e7e.csv',
  CHIRAG: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-CHIRAG_44676c39.csv',
  MUKESH: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-MUKESH_55a3dcf9.csv',
  NARENDRA: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-NARENDRA_abe1a003.csv',
  NITIN: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-NITIN_dc63824d.csv',
  SAI: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-SAI_4395fffa.csv',
  SAMEER: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-SAMEER_cdd759ef.csv',
  SANDEEP: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-SANDEEP_a7e8b4d6.csv',
  SHIVA: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-SHIVA_e1a8d5d4.csv',
  STALIN: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-STALIN_4b815e31.csv',
  SUNIL: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-SUNIL_1e71b0b4.csv',
  VARUN: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-VARUN_9be6955b.csv',
  VINIT: '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-VINIT_93867cf8.csv',
};

const NOV_OPERATOR_SHEETS: Record<string, string> = {
  ARBIND: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-ARBIND_44c8fd42.csv',
  CHIRAG: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-CHIRAG_08074ecc.csv',
  MUKESH: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-MUKESH_e4af53a0.csv',
  NARENDRA: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-NARENDRA_642a37b5.csv',
  NITIN: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-NITIN_721fc065.csv',
  SAI: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-SAI_7965ebc0.csv',
  SAMEER: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-SAMEER_08c1ad15.csv',
  SANDEEP: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-SANDEEP_2bdd616d.csv',
  SHIVA: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-SHIVA_320cbabf.csv',
  STALIN: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-STALIN_d45b23ee.csv',
  SUNIL: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-SUNIL_c894d7f3.csv',
  VARUN: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-VARUN_b8f1beb5.csv',
  VINIT: '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-VINIT_8a8f159b.csv',
};

const OCT_MASTER_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-Master_feef473b.csv';
const OCT_DASHBOARD_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-DASHBOARD_f9b862d6.csv';
const OCT_DTH_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-DTH_58a7a7d5.csv';
const OCT_SONY_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-October_2026_-_Landing-SONY_ACTIVITY_2e80cf36.csv';

const NOV_MASTER_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-Master_d53e570d.csv';
const NOV_DASHBOARD_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-DASHBOARD_9ab0661e.csv';
const NOV_DTH_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-DTH_2cca53b3.csv';
const NOV_SONY_URL =
  '/assets/aistudio/Monthly_Video_Tracker_-November_2026_-_Landing-SONY_ACTIVITY_2e80cf36.csv';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        i++;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function cleanStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseNum(val: unknown): number {
  const str = cleanStr(val).replace(/,/g, '');
  if (!str) return 0;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeType(val: string): NetworkType {
  const upper = val.toUpperCase().trim();
  if (upper === 'ONLINE') return 'ONLINE';
  if (upper === 'SHUTDOWN') return 'SHUTDOWN';
  if (upper === 'ON HOLD') return 'ON HOLD';
  return 'OFFLINE';
}

function normalizeCategory(val: string): NetworkCategory {
  const upper = val.toUpperCase().trim();
  if (upper === 'CATEGORY A') return 'CATEGORY A';
  if (upper === 'CATEGORY B') return 'CATEGORY B';
  return 'OTHERS';
}

function normalizeProgram(val: string): WeekUpdateProgram {
  const upper = val.toUpperCase().trim();
  if (upper === 'BARC') return 'BARC';
  if (upper === 'STAR') return 'STAR';
  if (upper === 'SHUTDOWN') return 'SHUTDOWN';
  return 'OTHERS';
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return dateStr.trim();
  const p0 = Number(parts[0]);
  const p1 = Number(parts[1]);
  if (!Number.isFinite(p0) || !Number.isFinite(p1)) return dateStr.trim();
  const month = p0 > 12 ? p1 : p0;
  const day = p0 > 12 ? p0 : p1;
  const monthName = MONTH_NAMES[month - 1];
  return monthName ? `${monthName} ${day}` : dateStr.trim();
}

function detectWeekStartNumber(
  groupRow: string[],
  dateHeaders: { date: string; dayName: string }[],
): number {
  const col46 = cleanStr(groupRow[46]);
  const match = col46.match(/(\d+)/);
  if (match) {
    const num = Number(match[1]);
    if (Number.isFinite(num) && num >= 1 && num <= 53) {
      return num;
    }
  }
  const firstDate = dateHeaders[0]?.date ?? '';
  if (firstDate.startsWith('11/')) return 45;
  return 40;
}

function buildRangeLabel(
  dateHeaders: { date: string; dayName: string }[],
  idx: number,
  fallbackWeekNum: number,
): string {
  const slice = dateHeaders.slice(idx * 7, idx * 7 + 7);
  if (slice.length >= 2) {
    return `${formatShortDate(slice[0].date)} – ${formatShortDate(slice[slice.length - 1].date)}`;
  }
  return `Week ${fallbackWeekNum}`;
}

export function parseMasterGrid(rows: string[][]): {
  records: MasterNetworkRecord[];
  dateHeaders: { date: string; dayName: string }[];
  weekStartNumber: number;
  cycleRangeLabel: string;
} {
  if (rows.length < 3) {
    return {
      records: [],
      dateHeaders: [],
      weekStartNumber: 40,
      cycleRangeLabel: '',
    };
  }

  let headerRowIdx = 1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const first = cleanStr(rows[i]?.[0]).toUpperCase();
    const sixth = cleanStr(rows[i]?.[5]).toUpperCase();
    if (first === 'SR' || sixth === 'NETWORK NAME') {
      headerRowIdx = i;
      break;
    }
  }

  const groupRow = headerRowIdx > 0 ? rows[headerRowIdx - 1] : [];
  const headerRow = rows[headerRowIdx];

  const dateHeaders: { date: string; dayName: string }[] = [];
  for (let c = 11; c <= 45; c++) {
    const d = cleanStr(headerRow[c]);
    if (d) {
      dateHeaders.push({
        date: d,
        dayName: cleanStr(groupRow[c]) || '',
      });
    }
  }

  const weekStartNumber = detectWeekStartNumber(groupRow, dateHeaders);
  const weekRanges = [0, 1, 2, 3, 4].map((idx) =>
    buildRangeLabel(dateHeaders, idx, weekStartNumber + idx),
  );
  const cycleRangeLabel =
    dateHeaders.length >= 2
      ? `${formatShortDate(dateHeaders[0].date)} – ${formatShortDate(dateHeaders[dateHeaders.length - 1].date)}, 2026 (${dateHeaders.length} days)`
      : '';

  const records: MasterNetworkRecord[] = [];
  const weekStartCols = [46, 53, 60, 67, 74];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 11) continue;

    const srStr = cleanStr(row[0]);
    const sr = Number(srStr);
    const networkName = cleanStr(row[5]);
    if (!srStr || !Number.isFinite(sr) || sr <= 0 || !networkName) {
      continue;
    }

    const daily = dateHeaders.map((dh, idx) => {
      const cellVal = cleanStr(row[11 + idx]).toUpperCase();
      return {
        date: dh.date,
        dayName: dh.dayName,
        on: cellVal === 'ON' || cellVal === '1' || cellVal === 'YES',
      };
    });

    const totalOnDays = daily.filter((d) => d.on).length;

    const weeks = weekStartCols.map((startCol, idx) => {
      const boxCount = parseNum(row[startCol]);
      const video1 = cleanStr(row[startCol + 1]);
      const video2 = cleanStr(row[startCol + 2]);
      const video3 = cleanStr(row[startCol + 3]);
      const videoCount = parseNum(row[startCol + 4]);
      const date = cleanStr(row[startCol + 5]);
      const remark = cleanStr(row[startCol + 6]);
      const starFlag = parseNum(row[91 + idx]);
      const barcFlag = parseNum(row[104 + idx]);
      const weekRemark = cleanStr(row[99 + idx]);

      return {
        weekNumber: weekStartNumber + idx,
        label: `W${idx + 1}`,
        rangeLabel: weekRanges[idx] ?? `Week ${weekStartNumber + idx}`,
        boxCount,
        video1,
        video2,
        video3,
        videoCount,
        date,
        remark,
        starFlag,
        barcFlag,
        weekRemark,
      };
    });

    const videoStatusRaw = cleanStr(row[85]).toUpperCase();
    const boxStatusRaw = cleanStr(row[86]).toUpperCase();
    const billingRaw = cleanStr(row[88]).toUpperCase();
    const budgetLabel = cleanStr(row[89]);

    const type = normalizeType(cleanStr(row[6]));
    const category = normalizeCategory(cleanStr(row[7]));
    const weekUpdate = normalizeProgram(cleanStr(row[8]));
    const operationName = cleanStr(row[10]).toUpperCase();
    const finalOperationName =
      cleanStr(row[87]).toUpperCase() || operationName;

    records.push({
      sr,
      code: cleanStr(row[1]) || cleanStr(row[4]),
      state: cleanStr(row[2]).toUpperCase(),
      city: cleanStr(row[3]),
      networkName,
      type,
      category,
      weekUpdate,
      machineNo: cleanStr(row[9]),
      operationName,
      finalOperationName,
      daily,
      totalOnDays,
      weeks,
      totalReported: parseNum(row[81]),
      boxCount: parseNum(row[82]),
      videoPayment: parseNum(row[83]),
      videoBilling: parseNum(row[84]),
      videoStatus: videoStatusRaw === 'YES' ? 'YES' : 'PENDING',
      boxStatus: boxStatusRaw === 'YES' ? 'YES' : 'PENDING',
      asPerBilling: (billingRaw === 'DONE' ? 'DONE' : 'PENDING') as BillingStatus,
      budget: parseNum(budgetLabel),
      budgetLabel: budgetLabel || '15',
      finalAmountToPay: parseNum(row[90]),
      barcVideoPayment: parseNum(row[109]),
      barcStatus: cleanStr(row[110]).toUpperCase() || 'PENDING',
    });
  }

  return { records, dateHeaders, weekStartNumber, cycleRangeLabel };
}

export function parseDashboardGrid(rows: string[][]): {
  operators: DashboardOperatorSummary[];
  totals: MonthWorkbook['dashboardTotals'];
} {
  const operatorMap = new Map<string, DashboardOperatorSummary>();

  const ensureOp = (opName: string, markets = ''): DashboardOperatorSummary => {
    const key = opName.trim().toUpperCase();
    const existing = operatorMap.get(key);
    if (existing) {
      if (markets && !existing.markets) existing.markets = markets;
      return existing;
    }
    const created: DashboardOperatorSummary = {
      markets,
      operationName: key,
      allTotal: 0,
      allOnline: 0,
      allOffline: 0,
      allWeeks: [0, 0, 0, 0, 0],
      catATotal: 0,
      catAOnline: 0,
      catAOffline: 0,
      catAWeeks: [0, 0, 0, 0, 0],
      billingAchieveAll: 0,
      billingAchieveA: 0,
      billingAchieveB: 0,
      billingAchieveOthers: 0,
      billingPendingAll: 0,
      billingPendingA: 0,
      billingPendingBO: 0,
      videoTotalNetworks: 0,
      videoWeeks: [0, 0, 0, 0, 0],
      pendingCurrentNetwork: 0,
      barcTotal: 0,
      barcOnline: 0,
      barcOffline: 0,
      barcWeeks: [0, 0, 0, 0, 0],
    };
    operatorMap.set(key, created);
    return created;
  };

  let totals: MonthWorkbook['dashboardTotals'] = null;

  for (let r = 4; r <= 26 && r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const opName = cleanStr(row[2]).toUpperCase();
    const markets = cleanStr(row[1]);

    if (opName === 'TOTAL ACHIEVE') {
      totals = {
        allAchieve: parseNum(row[3]),
        allOnline: parseNum(row[4]),
        allOffline: parseNum(row[5]),
        allWeeks: [6, 7, 8, 9, 10].map((c) => parseNum(row[c])),
        catAAchieve: parseNum(row[12]),
        catAOnline: parseNum(row[13]),
        catAOffline: parseNum(row[14]),
        catAWeeks: [15, 16, 17, 18, 19].map((c) => parseNum(row[c])),
        billingAchieveAll: parseNum(row[21]),
        billingAchieveA: parseNum(row[22]),
        billingAchieveB: parseNum(row[23]),
        billingAchieveOthers: parseNum(row[24]),
        billingPendingAll: parseNum(row[26]),
        billingPendingA: parseNum(row[27]),
        billingPendingBO: parseNum(row[28]),
        videoTotalNetworks: parseNum(row[31]),
        videoWeeks: [32, 33, 34, 35, 36].map((c) => parseNum(row[c])),
        pendingCurrentNetwork: parseNum(row[37]),
        barcAchieve: 0,
        barcOnline: 0,
        barcOffline: 0,
        barcWeeks: [0, 0, 0, 0, 0],
      };
      continue;
    }

    if (opName) {
      const entry = ensureOp(opName, markets);
      entry.allTotal = parseNum(row[3]);
      entry.allOnline = parseNum(row[4]);
      entry.allOffline = parseNum(row[5]);
      entry.allWeeks = [6, 7, 8, 9, 10].map((c) => parseNum(row[c]));
      entry.catATotal = parseNum(row[12]);
      entry.catAOnline = parseNum(row[13]);
      entry.catAOffline = parseNum(row[14]);
      entry.catAWeeks = [15, 16, 17, 18, 19].map((c) => parseNum(row[c]));
      entry.billingAchieveAll = parseNum(row[21]);
      entry.billingAchieveA = parseNum(row[22]);
      entry.billingAchieveB = parseNum(row[23]);
      entry.billingAchieveOthers = parseNum(row[24]);
      entry.billingPendingAll = parseNum(row[26]);
      entry.billingPendingA = parseNum(row[27]);
      entry.billingPendingBO = parseNum(row[28]);
    }

    const vidOpName = cleanStr(row[30]).toUpperCase();
    if (vidOpName && vidOpName !== 'TOTAL ACHIEVE') {
      const vEntry = ensureOp(vidOpName);
      vEntry.videoTotalNetworks = parseNum(row[31]);
      vEntry.videoWeeks = [32, 33, 34, 35, 36].map((c) => parseNum(row[c]));
      vEntry.pendingCurrentNetwork = parseNum(row[37]);
    }
  }

  for (let r = 33; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const opName = cleanStr(row[2]).toUpperCase();
    if (!opName) continue;

    if (opName === 'TOTAL ACHIEVE' && totals) {
      totals.barcAchieve = parseNum(row[3]);
      totals.barcOnline = parseNum(row[4]);
      totals.barcOffline = parseNum(row[5]);
      totals.barcWeeks = [6, 7, 8, 9, 10].map((c) => parseNum(row[c]));
      continue;
    }

    const entry = ensureOp(opName, cleanStr(row[1]));
    entry.barcTotal = parseNum(row[3]);
    entry.barcOnline = parseNum(row[4]);
    entry.barcOffline = parseNum(row[5]);
    entry.barcWeeks = [6, 7, 8, 9, 10].map((c) => parseNum(row[c]));
  }

  return {
    operators: Array.from(operatorMap.values()),
    totals,
  };
}

export function parseDthGrid(rows: string[][]): DthLogEntry[] {
  const entries: DthLogEntry[] = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const date = cleanStr(row[0]);
    const networkName = cleanStr(row[1]);
    if (!date || !networkName) continue;

    const rawAmount = cleanStr(row[5]);
    const parsedNum = Number(rawAmount.replace(/,/g, ''));
    const amount = rawAmount && Number.isFinite(parsedNum) ? parsedNum : null;

    const rawCount = cleanStr(row[4]);
    const count = rawCount && rawCount !== '-' ? parseNum(rawCount) : 0;

    entries.push({
      id: r,
      date,
      networkName,
      timing: cleanStr(row[2]) || '-',
      operator: cleanStr(row[3]).toUpperCase(),
      count,
      amount,
      rawAmount: rawAmount || '-',
    });
  }
  return entries;
}

export function parseSonyGrid(rows: string[][]): {
  dates: string[];
  rows: SonyActivityRow[];
} {
  if (rows.length < 2) return { dates: [], rows: [] };
  const header = rows[0];
  const dates = header.slice(5).map((d) => cleanStr(d)).filter(Boolean);
  const parsed: SonyActivityRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const dpoName = cleanStr(row[3]);
    if (!dpoName) continue;

    const dailyValues = dates.map((date, idx) => {
      const raw = cleanStr(row[5 + idx]);
      const num = raw ? Number(raw) : NaN;
      return {
        date,
        value: Number.isFinite(num) ? num : null,
      };
    });

    const totalCount = dailyValues.reduce((sum, dv) => sum + (dv.value ?? 0), 0);

    parsed.push({
      state: cleanStr(row[0]),
      city: cleanStr(row[1]),
      code: cleanStr(row[2]),
      dpoName,
      type: cleanStr(row[4]),
      dailyValues,
      totalCount,
    });
  }

  return { dates, rows: parsed };
}

export function parseOperatorPendingGrid(rows: string[][]): OperatorPendingRow[] {
  if (rows.length < 2) return [];
  const firstColHeader = cleanStr(rows[0]?.[0]).toUpperCase();
  const hasNoSrCol = firstColHeader === 'STATE';

  const items: OperatorPendingRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    if (hasNoSrCol) {
      const state = cleanStr(row[0]).toUpperCase();
      const city = cleanStr(row[1]);
      const code = cleanStr(row[2]);
      const networkName = cleanStr(row[3]);
      if (!networkName && !code) continue;

      items.push({
        srNo: items.length + 1,
        state,
        city,
        code,
        networkName,
        weekUpdate: cleanStr(row[4]).toUpperCase(),
        operationName: cleanStr(row[5]).toUpperCase(),
      });
    } else {
      const networkName = cleanStr(row[4]);
      const code = cleanStr(row[3]);
      if (!networkName && !code) continue;

      items.push({
        srNo: parseNum(row[0]) || items.length + 1,
        state: cleanStr(row[1]).toUpperCase(),
        city: cleanStr(row[2]),
        code,
        networkName,
        weekUpdate: cleanStr(row[5]).toUpperCase(),
        operationName: cleanStr(row[6]).toUpperCase(),
      });
    }
  }
  return items;
}

async function fetchCsvText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }
  return res.text();
}

async function loadMonthBundle(params: {
  monthScope: MonthScope;
  sourceName: string;
  periodLabel: string;
  masterUrl: string;
  dashboardUrl: string;
  dthUrl: string;
  sonyUrl: string;
  operatorSheets: Record<string, string>;
}): Promise<MonthWorkbook> {
  const operatorEntries = Object.entries(params.operatorSheets);

  const [masterText, dashboardText, dthText, sonyText, ...opTexts] =
    await Promise.all([
      fetchCsvText(params.masterUrl),
      fetchCsvText(params.dashboardUrl),
      fetchCsvText(params.dthUrl),
      fetchCsvText(params.sonyUrl),
      ...operatorEntries.map(([, url]) => fetchCsvText(url)),
    ]);

  const masterParsed = parseMasterGrid(parseCsvRows(masterText));
  const dashRows = parseCsvRows(dashboardText);
  const dashboardParsed = parseDashboardGrid(dashRows);
  const activeWeekHint = cleanStr(dashRows[2]?.[37]) || 'W5';
  const dthLogs = parseDthGrid(parseCsvRows(dthText));
  const sonyParsed = parseSonyGrid(parseCsvRows(sonyText));

  const operatorQueues: Record<string, OperatorPendingRow[]> = {};
  operatorEntries.forEach(([opName], idx) => {
    operatorQueues[opName] = parseOperatorPendingGrid(parseCsvRows(opTexts[idx]));
  });

  return {
    monthScope: params.monthScope,
    sourceName: params.sourceName,
    periodLabel: params.periodLabel,
    activeWeekHint,
    weekStartNumber: masterParsed.weekStartNumber,
    cycleRangeLabel: masterParsed.cycleRangeLabel,
    dateHeaders: masterParsed.dateHeaders,
    masterRecords: masterParsed.records,
    dashboardOperators: dashboardParsed.operators,
    dashboardTotals: dashboardParsed.totals,
    dthLogs,
    sonyDates: sonyParsed.dates,
    sonyActivity: sonyParsed.rows,
    operatorQueues,
  };
}

export async function loadDefaultWorkbook(): Promise<WorkbookData> {
  const [oct2026, nov2026] = await Promise.all([
    loadMonthBundle({
      monthScope: 'oct2026',
      sourceName: 'Monthly Video Tracker - October 2026 (19 sheets)',
      periodLabel: 'Oct 2026 · Sep 28 – Nov 1 (WK40–WK44)',
      masterUrl: OCT_MASTER_URL,
      dashboardUrl: OCT_DASHBOARD_URL,
      dthUrl: OCT_DTH_URL,
      sonyUrl: OCT_SONY_URL,
      operatorSheets: OCT_OPERATOR_SHEETS,
    }),
    loadMonthBundle({
      monthScope: 'nov2026',
      sourceName: 'Monthly Video Tracker - November 2026 (19 sheets)',
      periodLabel: 'Nov 2026 · Nov 2 – Dec 6 (WK45–WK49)',
      masterUrl: NOV_MASTER_URL,
      dashboardUrl: NOV_DASHBOARD_URL,
      dthUrl: NOV_DTH_URL,
      sonyUrl: NOV_SONY_URL,
      operatorSheets: NOV_OPERATOR_SHEETS,
    }),
  ]);

  return {
    loadedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    oct2026,
    nov2026,
    snapshotOnly: null,
  };
}

export async function parseUploadedWorkbook(file: File): Promise<WorkbookData> {
  const lower = file.name.toLowerCase();
  const loadedAt = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (lower.endsWith('.csv')) {
    const text = await file.text();
    const rows = parseCsvRows(text);
    const masterParsed = parseMasterGrid(rows);
    if (masterParsed.records.length > 0) {
      const detectedScope: MonthScope =
        masterParsed.weekStartNumber >= 45 || lower.includes('nov')
          ? 'nov2026'
          : 'oct2026';
      const monthWb: MonthWorkbook = {
        monthScope: detectedScope,
        sourceName: file.name,
        periodLabel: `Uploaded CSV · ${masterParsed.cycleRangeLabel || 'Master Sheet'}`,
        activeWeekHint: detectedScope === 'nov2026' ? 'W3' : 'W5',
        weekStartNumber: masterParsed.weekStartNumber,
        cycleRangeLabel: masterParsed.cycleRangeLabel,
        dateHeaders: masterParsed.dateHeaders,
        masterRecords: masterParsed.records,
        dashboardOperators: [],
        dashboardTotals: null,
        dthLogs: [],
        sonyDates: [],
        sonyActivity: [],
        operatorQueues: {},
      };
      return {
        loadedAt,
        oct2026: detectedScope === 'oct2026' ? monthWb : null,
        nov2026: detectedScope === 'nov2026' ? monthWb : null,
        snapshotOnly: null,
      };
    }

    const dashParsed = parseDashboardGrid(rows);
    if (dashParsed.totals && dashParsed.operators.length > 0) {
      return {
        loadedAt,
        oct2026: null,
        nov2026: null,
        snapshotOnly: {
          sourceName: file.name,
          periodLabel: 'Uploaded Dashboard Summary CSV',
          activeWeekHint: cleanStr(rows[2]?.[37]) || 'W5',
          operators: dashParsed.operators,
          totals: dashParsed.totals,
        },
      };
    }

    throw new Error(
      'No valid Master network rows or Dashboard summary rows were found in the uploaded CSV.',
    );
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetToGrid = (sheetName: string): string[][] => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });
    return aoa.map((row) => row.map((cell) => cleanStr(cell)));
  };

  const findSheet = (candidates: string[]): string | undefined => {
    return workbook.SheetNames.find((name) =>
      candidates.some((c) => name.toLowerCase().includes(c.toLowerCase())),
    );
  };

  const masterSheetName = findSheet(['master']) ?? workbook.SheetNames[0];
  const masterParsed = parseMasterGrid(sheetToGrid(masterSheetName));

  if (masterParsed.records.length === 0) {
    throw new Error(
      `Could not detect Master tracker rows in sheet "${masterSheetName}".`,
    );
  }

  const dashSheetName = findSheet(['dashboard']);
  const dashRows = dashSheetName ? sheetToGrid(dashSheetName) : [];
  const dashParsed = dashSheetName
    ? parseDashboardGrid(dashRows)
    : { operators: [], totals: null };
  const activeWeekHint = cleanStr(dashRows[2]?.[37]) || 'W5';

  const dthSheetName = findSheet(['dth']);
  const dthLogs = dthSheetName ? parseDthGrid(sheetToGrid(dthSheetName)) : [];

  const sonySheetName = findSheet(['sony']);
  const sonyParsed = sonySheetName
    ? parseSonyGrid(sheetToGrid(sonySheetName))
    : { dates: [], rows: [] };

  const operatorQueues: Record<string, OperatorPendingRow[]> = {};
  for (const opName of Object.keys(NOV_OPERATOR_SHEETS)) {
    const opSheet = workbook.SheetNames.find(
      (s) => s.trim().toUpperCase() === opName,
    );
    if (opSheet) {
      operatorQueues[opName] = parseOperatorPendingGrid(sheetToGrid(opSheet));
    }
  }

  const detectedScope: MonthScope =
    masterParsed.weekStartNumber >= 45 || lower.includes('nov')
      ? 'nov2026'
      : 'oct2026';

  const monthWb: MonthWorkbook = {
    monthScope: detectedScope,
    sourceName: file.name,
    periodLabel: `Workbook (${workbook.SheetNames.length} sheets)`,
    activeWeekHint,
    weekStartNumber: masterParsed.weekStartNumber,
    cycleRangeLabel: masterParsed.cycleRangeLabel,
    dateHeaders: masterParsed.dateHeaders,
    masterRecords: masterParsed.records,
    dashboardOperators: dashParsed.operators,
    dashboardTotals: dashParsed.totals,
    dthLogs,
    sonyDates: sonyParsed.dates,
    sonyActivity: sonyParsed.rows,
    operatorQueues,
  };

  return {
    loadedAt,
    oct2026: detectedScope === 'oct2026' ? monthWb : null,
    nov2026: detectedScope === 'nov2026' ? monthWb : null,
    snapshotOnly: null,
  };
}
