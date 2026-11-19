export type NetworkType = 'ONLINE' | 'OFFLINE' | 'SHUTDOWN' | 'ON HOLD';
export type NetworkCategory = 'CATEGORY A' | 'CATEGORY B' | 'OTHERS';
export type WeekUpdateProgram = 'BARC' | 'STAR' | 'OTHERS' | 'SHUTDOWN';
export type BillingStatus = 'DONE' | 'PENDING';

export interface DailyLanding {
  date: string;
  dayName: string;
  on: boolean;
}

export interface WeeklyLog {
  weekNumber: number;
  label: string;
  rangeLabel: string;
  boxCount: number;
  video1: string;
  video2: string;
  video3: string;
  videoCount: number;
  date: string;
  remark: string;
  starFlag: number;
  barcFlag: number;
  weekRemark: string;
}

export interface MasterNetworkRecord {
  sr: number;
  code: string;
  state: string;
  city: string;
  networkName: string;
  type: NetworkType;
  category: NetworkCategory;
  weekUpdate: WeekUpdateProgram;
  machineNo: string;
  operationName: string;
  finalOperationName: string;
  daily: DailyLanding[];
  totalOnDays: number;
  weeks: WeeklyLog[];
  totalReported: number;
  boxCount: number;
  videoPayment: number;
  videoBilling: number;
  videoStatus: 'YES' | 'PENDING';
  boxStatus: 'YES' | 'PENDING';
  asPerBilling: BillingStatus;
  budget: number;
  budgetLabel: string;
  baseAmountToPay: number;
  finalAmountToPay: number;
  videoWeeksCount: number;
  extraVideoCount: number;
  isAllWeeksBonus: boolean;
  barcVideoPayment: number;
  barcStatus: string;
}

export interface DashboardOperatorSummary {
  markets: string;
  operationName: string;
  allTotal: number;
  allOnline: number;
  allOffline: number;
  allWeeks: number[];
  catATotal: number;
  catAOnline: number;
  catAOffline: number;
  catAWeeks: number[];
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
  barcWeeks: number[];
}

export interface DthLogEntry {
  id: number;
  date: string;
  networkName: string;
  timing: string;
  operator: string;
  count: number;
  amount: number | null;
  rawAmount: string;
}

export interface SonyActivityRow {
  state: string;
  city: string;
  code: string;
  dpoName: string;
  type: string;
  dailyValues: { date: string; value: number | null }[];
  totalCount: number;
}

export interface OperatorPendingRow {
  srNo: number;
  state: string;
  city: string;
  code: string;
  networkName: string;
  weekUpdate: string;
  operationName: string;
}

export interface DashboardDataSnapshot {
  sourceName: string;
  periodLabel: string;
  activeWeekHint: string;
  operators: DashboardOperatorSummary[];
  totals: {
    allAchieve: number;
    allOnline: number;
    allOffline: number;
    allWeeks: number[];
    catAAchieve: number;
    catAOnline: number;
    catAOffline: number;
    catAWeeks: number[];
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
    barcAchieve: number;
    barcOnline: number;
    barcOffline: number;
    barcWeeks: number[];
  } | null;
}

export type MonthScope = 'oct2026' | 'nov2026';

export interface MonthWorkbook {
  monthScope: MonthScope;
  sourceName: string;
  periodLabel: string;
  activeWeekHint: string;
  weekStartNumber: number;
  cycleRangeLabel: string;
  dateHeaders: { date: string; dayName: string }[];
  masterRecords: MasterNetworkRecord[];
  dashboardOperators: DashboardOperatorSummary[];
  dashboardTotals: DashboardDataSnapshot['totals'];
  dthLogs: DthLogEntry[];
  sonyDates: string[];
  sonyActivity: SonyActivityRow[];
  operatorQueues: Record<string, OperatorPendingRow[]>;
}

export interface WorkbookData {
  loadedAt: string;
  oct2026: MonthWorkbook | null;
  nov2026: MonthWorkbook | null;
  snapshotOnly: DashboardDataSnapshot | null;
}

export type WeekFilter = 'ALL' | 1 | 2 | 3 | 4 | 5;

export interface TrackerFilters {
  week: WeekFilter;
  search: string;
  operator: string;
  state: string;
  type: 'ALL' | NetworkType;
  category: 'ALL' | NetworkCategory;
  program: 'ALL' | WeekUpdateProgram;
  billing: 'ALL' | BillingStatus;
}

export type ActiveTab =
  | 'overview'
  | 'master'
  | 'operators'
  | 'pending'
  | 'billing'
  | 'dth';
