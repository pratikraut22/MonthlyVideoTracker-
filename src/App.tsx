import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Download,
  FileSpreadsheet,
  IndianRupee,
  LayoutDashboard,
  ListFilter,
  Menu,
  RotateCcw,
  Table2,
  Tv,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { BillingExceptionsView } from './components/BillingExceptionsView';
import { DashboardSnapshotView } from './components/DashboardSnapshotView';
import { DthSonyView } from './components/DthSonyView';
import { FilterBar } from './components/FilterBar';
import { MasterTrackerView } from './components/MasterTrackerView';
import { NetworkDrawer } from './components/NetworkDrawer';
import { OperatorQueuesView } from './components/OperatorQueuesView';
import { OverviewView } from './components/OverviewView';
import { PendingView } from './components/PendingView';
import { WeekSelectorBar } from './components/WeekSelectorBar';
import {
  loadDefaultWorkbook,
  parseUploadedWorkbook,
} from './data/trackerLoader';
import type {
  ActiveTab,
  MasterNetworkRecord,
  MonthScope,
  MonthWorkbook,
  TrackerFilters,
  WorkbookData,
} from './types/tracker';
import {
  DEFAULT_FILTERS,
  computeOverviewStats,
  exportDashboardSnapshotToCsv,
  exportRecordsToCsv,
  filterMasterRecords,
} from './utils/analytics';

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'master', label: 'Master Tracker', icon: Table2 },
  { id: 'operators', label: 'Operator', icon: Users },
  { id: 'pending', label: 'Pending', icon: ListFilter },
  { id: 'billing', label: 'Billing & Exceptions', icon: IndianRupee },
  { id: 'dth', label: 'DTH & Sony Activity', icon: Tv },
];

export default function App() {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [monthScope, setMonthScope] = useState<MonthScope>('nov2026');
  const [filters, setFilters] = useState<TrackerFilters>(DEFAULT_FILTERS);
  const [selectedOperatorQueue, setSelectedOperatorQueue] = useState('ARBIND');
  const [inspectedRecord, setInspectedRecord] =
    useState<MasterNetworkRecord | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    setUploadError(null);
    try {
      const data = await loadDefaultWorkbook();
      setWorkbook(data);
      setMonthScope(data.nov2026 ? 'nov2026' : 'oct2026');
      setIsCustomUpload(false);
      setFilters(DEFAULT_FILTERS);
      setInspectedRecord(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load tracker workbook files.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setLoading(true);
    try {
      const parsed = await parseUploadedWorkbook(file);
      setWorkbook(parsed);
      setMonthScope(parsed.nov2026 ? 'nov2026' : 'oct2026');
      setIsCustomUpload(true);
      setFilters(DEFAULT_FILTERS);
      setInspectedRecord(null);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Could not parse uploaded workbook.',
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeMonthWorkbook: MonthWorkbook | null = useMemo(() => {
    if (!workbook) return null;
    if (monthScope === 'nov2026') {
      return workbook.nov2026 ?? workbook.oct2026;
    }
    return workbook.oct2026 ?? workbook.nov2026;
  }, [workbook, monthScope]);

  const effectiveMonthScope: MonthScope =
    activeMonthWorkbook?.monthScope ?? monthScope;

  const comparisonWorkbook = useMemo(() => {
    if (!workbook || !activeMonthWorkbook) return null;
    return activeMonthWorkbook.monthScope === 'nov2026'
      ? workbook.oct2026
      : workbook.nov2026;
  }, [workbook, activeMonthWorkbook]);

  const comparisonTotals = comparisonWorkbook?.dashboardTotals ?? null;
  const comparisonRosterCount = comparisonWorkbook?.masterRecords.length;

  const operators = useMemo(() => {
    if (!activeMonthWorkbook) return [];
    return Array.from(
      new Set(
        activeMonthWorkbook.masterRecords
          .map((r) => r.operationName)
          .filter(Boolean),
      ),
    ).sort();
  }, [activeMonthWorkbook]);

  const states = useMemo(() => {
    if (!activeMonthWorkbook) return [];
    return Array.from(
      new Set(
        activeMonthWorkbook.masterRecords.map((r) => r.state).filter(Boolean),
      ),
    ).sort();
  }, [activeMonthWorkbook]);

  const filteredRecords = useMemo(() => {
    if (!activeMonthWorkbook) return [];
    return filterMasterRecords(activeMonthWorkbook.masterRecords, filters);
  }, [activeMonthWorkbook, filters]);

  const overviewStats = useMemo(
    () =>
      computeOverviewStats(filteredRecords, filters.week, effectiveMonthScope),
    [filteredRecords, filters.week, effectiveMonthScope],
  );

  const activeNavMeta =
    NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  const activeNavSubtitle: Record<ActiveTab, string> = {
    overview: 'Portfolio health, week-wise achievements and video monitoring',
    master: 'Full network roster, 35-day box matrix, video logs and billing',
    operators: 'Operator-wise pending queues and dispatch follow-ups',
    pending: 'Active networks without a landing video in the selected period',
    billing: 'Billing settlements, payout approvals and remark exceptions',
    dth: 'Daily DTH feed submissions and Sony activity matrix',
  };

  const handleJumpToOperatorQueue = (op: string) => {
    setSelectedOperatorQueue(op);
    setActiveTab('operators');
  };

  const snapshotOnly = workbook?.snapshotOnly ?? null;

  const activeCountDisplay = activeMonthWorkbook
    ? activeMonthWorkbook.masterRecords.filter(
        (r) => r.type === 'ONLINE' || r.type === 'OFFLINE',
      ).length
    : 0;

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => void handleFileUpload(e.target.files?.[0])}
      />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 bg-[#0B1222] text-slate-300 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-150 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate tracking-tight">
                  Landing Tracker
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Network video monitoring
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3.5 space-y-1.5" aria-label="Primary sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-3 whitespace-nowrap shrink-0 cursor-pointer transition-colors border ${
                    active
                      ? 'bg-blue-600/12 border-blue-500 text-white'
                      : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 text-xs">
          <div className="bg-[#101A30] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Source workbook</span>
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {activeMonthWorkbook
                  ? activeMonthWorkbook.sourceName
                  : snapshotOnly
                    ? snapshotOnly.sourceName
                    : 'Loading workbooks...'}
              </div>
              {activeMonthWorkbook && (
                <div className="text-[11px] font-mono tabular-nums text-slate-400">
                  {activeCountDisplay} active ·{' '}
                  {activeMonthWorkbook.masterRecords.length} total
                </div>
              )}
              {workbook && (
                <div className="text-[10px] font-mono tabular-nums text-slate-500 space-y-0.5 pt-1 border-t border-slate-800/80">
                  {workbook.nov2026 && (
                    <div
                      className={
                        effectiveMonthScope === 'nov2026'
                          ? 'text-blue-300 font-medium'
                          : 'text-slate-500'
                      }
                    >
                      Nov 2026: {workbook.nov2026.masterRecords.length} rows ·{' '}
                      {workbook.nov2026.activeWeekHint}
                    </div>
                  )}
                  {workbook.oct2026 && (
                    <div
                      className={
                        effectiveMonthScope === 'oct2026'
                          ? 'text-blue-300 font-medium'
                          : 'text-slate-500'
                      }
                    >
                      Oct 2026: {workbook.oct2026.masterRecords.length} rows
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-8 px-2.5 inline-flex items-center justify-center gap-1.5 bg-[#17233D] hover:bg-[#1E2E4F] text-slate-100 font-medium rounded-lg border border-slate-700/80 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-300" />
                Load Excel / CSV
              </button>
              {isCustomUpload && (
                <button
                  type="button"
                  onClick={() => void loadInitialData()}
                  className="w-full h-8 px-2.5 inline-flex items-center justify-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 font-medium rounded-lg border border-blue-500/40 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Default
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate tracking-tight">
                {activeNavMeta.label}
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {activeNavSubtitle[activeTab]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {workbook && (
              <span className="hidden md:inline-flex items-center h-8 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 whitespace-nowrap">
                {effectiveMonthScope === 'nov2026'
                  ? 'November 2026'
                  : 'October 2026'}
                {activeMonthWorkbook?.activeWeekHint
                  ? ` · ${activeMonthWorkbook.activeWeekHint}`
                  : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Import
            </button>
            <button
              type="button"
              disabled={
                !workbook ||
                (snapshotOnly
                  ? snapshotOnly.operators.length === 0
                  : filteredRecords.length === 0)
              }
              onClick={() => {
                if (!workbook) return;
                if (snapshotOnly) {
                  exportDashboardSnapshotToCsv(snapshotOnly);
                } else {
                  exportRecordsToCsv(filteredRecords, effectiveMonthScope);
                }
              }}
              className="h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-5">
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-red-700 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-5 animate-pulse">
              <div className="h-12 bg-white border border-slate-200 rounded-lg" />
              <div className="h-24 bg-white border border-slate-200 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="h-28 bg-white border border-slate-200 rounded-lg" />
                <div className="h-28 bg-white border border-slate-200 rounded-lg" />
                <div className="h-28 bg-white border border-slate-200 rounded-lg" />
                <div className="h-28 bg-white border border-slate-200 rounded-lg" />
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-lg" />
            </div>
          ) : error || (!activeMonthWorkbook && !snapshotOnly) ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h2 className="text-base font-semibold text-slate-900">
                Unable to load workbook data
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {error || 'No workbook data available.'}
              </p>
              <button
                type="button"
                onClick={() => void loadInitialData()}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                Retry Loading Workbook
              </button>
            </div>
          ) : snapshotOnly ? (
            <>
              <WeekSelectorBar
                selectedWeek={filters.week}
                onSelectWeek={(week) => setFilters({ ...filters, week })}
                monthScope="nov2026"
                onSelectMonthScope={() => {}}
                hasNovember={true}
                hasOctober={false}
                novActiveWeekHint={snapshotOnly.activeWeekHint}
              />
              <DashboardSnapshotView
                snapshot={snapshotOnly}
                baselineTotals={null}
                baselineOperators={[]}
                selectedWeek={filters.week}
                onSelectWeek={(week) => setFilters({ ...filters, week })}
                sectionFocus={
                  activeTab === 'operators' || activeTab === 'billing'
                    ? activeTab
                    : 'overview'
                }
              />
            </>
          ) : activeMonthWorkbook ? (
            <>
              <WeekSelectorBar
                selectedWeek={filters.week}
                onSelectWeek={(week) => setFilters({ ...filters, week })}
                monthScope={effectiveMonthScope}
                onSelectMonthScope={(nextScope) => {
                  setMonthScope(nextScope);
                  setFilters({ ...filters, week: 'ALL', state: 'ALL' });
                  setInspectedRecord(null);
                }}
                hasNovember={Boolean(workbook?.nov2026)}
                hasOctober={Boolean(workbook?.oct2026)}
                novCount={workbook?.nov2026?.masterRecords.length ?? 0}
                octCount={workbook?.oct2026?.masterRecords.length ?? 0}
                novActiveWeekHint={workbook?.nov2026?.activeWeekHint ?? 'W3'}
                cycleRangeLabel={activeMonthWorkbook.cycleRangeLabel}
              />

              {(activeTab === 'overview' ||
                activeTab === 'master' ||
                activeTab === 'billing') && (
                <FilterBar
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(DEFAULT_FILTERS)}
                  operators={operators}
                  states={states}
                  totalCount={activeMonthWorkbook.masterRecords.length}
                  filteredCount={filteredRecords.length}
                />
              )}

              {activeTab === 'overview' && (
                <OverviewView
                  stats={overviewStats}
                  records={filteredRecords}
                  dashboardOperators={activeMonthWorkbook.dashboardOperators}
                  filters={filters}
                  monthScope={effectiveMonthScope}
                  cycleRangeLabel={activeMonthWorkbook.cycleRangeLabel}
                  comparisonTotals={comparisonTotals}
                  comparisonRosterCount={comparisonRosterCount}
                  comparisonRecords={comparisonWorkbook?.masterRecords}
                  comparisonMonthScope={comparisonWorkbook?.monthScope}
                  onUpdateFilters={setFilters}
                  onJumpToMaster={() => setActiveTab('master')}
                  onJumpToOperatorQueue={handleJumpToOperatorQueue}
                  onSelectRecord={setInspectedRecord}
                />
              )}

              {activeTab === 'master' && (
                <MasterTrackerView
                  records={filteredRecords}
                  selectedWeek={filters.week}
                  monthScope={effectiveMonthScope}
                  onSelectRecord={setInspectedRecord}
                  onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                />
              )}

              {activeTab === 'operators' && (
                <OperatorQueuesView
                  operatorQueues={activeMonthWorkbook.operatorQueues}
                  masterRecords={activeMonthWorkbook.masterRecords}
                  dashboardOperators={activeMonthWorkbook.dashboardOperators}
                  selectedOperator={selectedOperatorQueue}
                  selectedWeek={filters.week}
                  monthScope={effectiveMonthScope}
                  onSelectOperator={setSelectedOperatorQueue}
                  onSelectRecord={setInspectedRecord}
                />
              )}

              {activeTab === 'pending' && (
                <PendingView
                  records={activeMonthWorkbook.masterRecords}
                  selectedWeek={filters.week}
                  monthScope={effectiveMonthScope}
                  onSelectWeek={(week) => setFilters({ ...filters, week })}
                  onSelectRecord={setInspectedRecord}
                />
              )}

              {activeTab === 'billing' && (
                <BillingExceptionsView
                  records={filteredRecords}
                  stats={overviewStats}
                  selectedWeek={filters.week}
                  monthScope={effectiveMonthScope}
                  onSelectRecord={setInspectedRecord}
                />
              )}

              {activeTab === 'dth' && (
                <DthSonyView
                  dthLogs={activeMonthWorkbook.dthLogs}
                  sonyDates={activeMonthWorkbook.sonyDates}
                  sonyActivity={activeMonthWorkbook.sonyActivity}
                  selectedWeek={filters.week}
                  monthScope={effectiveMonthScope}
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      <NetworkDrawer
        record={inspectedRecord}
        monthScope={effectiveMonthScope}
        onClose={() => setInspectedRecord(null)}
      />
    </div>
  );
}
