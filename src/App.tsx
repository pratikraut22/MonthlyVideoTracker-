import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Download,
  FileSpreadsheet,
  IndianRupee,
  LayoutDashboard,
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
import { WeekSelectorBar } from './components/WeekSelectorBar';
import {
  loadDefaultWorkbook,
  parseUploadedWorkbook,
} from './data/trackerLoader';
import type {
  ActiveTab,
  MasterNetworkRecord,
  MonthScope,
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
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'master', label: 'Master Tracker', icon: Table2 },
  { id: 'operators', label: 'Operator Queues', icon: Users },
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
      setMonthScope(data.novemberDashboard ? 'nov2026' : 'oct2026');
      setIsCustomUpload(false);
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
      setMonthScope(
        parsed.masterRecords.length > 0
          ? 'oct2026'
          : parsed.novemberDashboard
            ? 'nov2026'
            : 'oct2026',
      );
      setIsCustomUpload(true);
      setFilters(DEFAULT_FILTERS);
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

  const operators = useMemo(() => {
    if (!workbook) return [];
    return Array.from(
      new Set(
        workbook.masterRecords.map((r) => r.operationName).filter(Boolean),
      ),
    ).sort();
  }, [workbook]);

  const states = useMemo(() => {
    if (!workbook) return [];
    return Array.from(
      new Set(workbook.masterRecords.map((r) => r.state).filter(Boolean)),
    ).sort();
  }, [workbook]);

  const filteredRecords = useMemo(() => {
    if (!workbook) return [];
    return filterMasterRecords(workbook.masterRecords, filters);
  }, [workbook, filters]);

  const overviewStats = useMemo(
    () => computeOverviewStats(filteredRecords, filters.week),
    [filteredRecords, filters.week],
  );

  const activeNavMeta =
    NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  const handleJumpToOperatorQueue = (op: string) => {
    setSelectedOperatorQueue(op);
    setActiveTab('operators');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => void handleFileUpload(e.target.files?.[0])}
      />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  Landing Tracker
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  Video Operations
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1" aria-label="Primary sections">
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
                  className={`w-full px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Active Workbook</span>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              {workbook ? workbook.periodLabel : 'Loading workbook...'}
            </div>
            {workbook && (
              <div className="text-[11px] font-mono tabular-nums text-slate-500 space-y-0.5">
                {workbook.novemberDashboard && (
                  <div className="text-emerald-700 font-medium">
                    Nov 2026: {workbook.novemberDashboard.totals?.allAchieve ?? 0} achieve ·{' '}
                    {workbook.novemberDashboard.activeWeekHint}
                  </div>
                )}
                {workbook.masterRecords.length > 0 && (
                  <div>
                    Oct 2026: {workbook.masterRecords.length} networks · {workbook.dthLogs.length} DTH
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 px-2.5 inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded border border-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import .xlsx / .csv
            </button>
            {isCustomUpload && (
              <button
                type="button"
                onClick={() => void loadInitialData()}
                className="w-full h-8 px-2.5 inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-blue-700 font-medium rounded border border-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Default Workbook
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-400 hidden sm:inline">
                Operations Tracker
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavMeta.label}
              </h1>
              {workbook && (
                <span className="hidden md:inline text-xs font-mono text-slate-500">
                  ·{' '}
                  {monthScope === 'nov2026' && workbook.novemberDashboard
                    ? 'November 2026'
                    : 'October 2026'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Load Excel / CSV
            </button>
            <button
              type="button"
              disabled={
                !workbook ||
                (monthScope === 'nov2026' && workbook.novemberDashboard
                  ? workbook.novemberDashboard.operators.length === 0
                  : filteredRecords.length === 0)
              }
              onClick={() => {
                if (!workbook) return;
                if (monthScope === 'nov2026' && workbook.novemberDashboard) {
                  exportDashboardSnapshotToCsv(workbook.novemberDashboard);
                } else {
                  exportRecordsToCsv(filteredRecords);
                }
              }}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
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
          ) : error || !workbook ? (
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
          ) : (
            <>
              <WeekSelectorBar
                selectedWeek={filters.week}
                onSelectWeek={(week) => setFilters({ ...filters, week })}
                monthScope={monthScope}
                onSelectMonthScope={(nextScope) => {
                  setMonthScope(nextScope);
                  setFilters({ ...filters, week: 'ALL' });
                }}
                hasNovember={Boolean(workbook.novemberDashboard)}
                hasMaster={workbook.masterRecords.length > 0}
                novActiveWeekHint={workbook.novemberDashboard?.activeWeekHint ?? 'W3'}
                masterCount={workbook.masterRecords.length}
              />

              {monthScope === 'nov2026' && workbook.novemberDashboard ? (
                <>
                  {(activeTab === 'overview' ||
                    activeTab === 'operators' ||
                    activeTab === 'billing') && (
                    <DashboardSnapshotView
                      snapshot={workbook.novemberDashboard}
                      baselineTotals={workbook.dashboardTotals}
                      baselineOperators={workbook.dashboardOperators}
                      selectedWeek={filters.week}
                      onSelectWeek={(week) => setFilters({ ...filters, week })}
                      onSwitchToOct={
                        workbook.masterRecords.length > 0
                          ? () => setMonthScope('oct2026')
                          : undefined
                      }
                      sectionFocus={activeTab}
                    />
                  )}

                  {(activeTab === 'master' || activeTab === 'dth') && (
                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                      <h2 className="text-base font-semibold text-slate-900">
                        {activeTab === 'master'
                          ? 'Row-level Master sheet is not included in the November 2026 CSV'
                          : 'DTH & Sony sheets are not included in the November 2026 CSV'}
                      </h2>
                      <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                        The attached <span className="font-mono">Monthly Video Tracker - November 2026 - Landing.csv</span> file contains the{' '}
                        <strong className="text-slate-900">DASHBOARD</strong> summary sheet (727 achieve · 873 roster · W1–W3). You can upload a full November Master/DTH CSV or switch to the full October 2026 workbook (872 master rows, 224 DTH logs, 15 Sony DPOs).
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                        {workbook.masterRecords.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMonthScope('oct2026')}
                            className="h-8 px-3.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Switch to Oct 2026 Full ({workbook.masterRecords.length} rows)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab('overview')}
                          className="h-8 px-3.5 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Back to Nov 2026 Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 px-3.5 text-xs font-medium bg-white text-blue-700 border border-slate-200 rounded hover:bg-blue-50 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Import Nov Master .xlsx / .csv
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(activeTab === 'overview' ||
                    activeTab === 'master' ||
                    activeTab === 'billing') && (
                    <FilterBar
                      filters={filters}
                      onChange={setFilters}
                      onReset={() => setFilters(DEFAULT_FILTERS)}
                      operators={operators}
                      states={states}
                      totalCount={workbook.masterRecords.length}
                      filteredCount={filteredRecords.length}
                    />
                  )}

                  {activeTab === 'overview' && (
                    <OverviewView
                      stats={overviewStats}
                      dashboardOperators={workbook.dashboardOperators}
                      filters={filters}
                      onUpdateFilters={setFilters}
                      onJumpToMaster={() => setActiveTab('master')}
                      onJumpToOperatorQueue={handleJumpToOperatorQueue}
                    />
                  )}

                  {activeTab === 'master' && (
                    <MasterTrackerView
                      records={filteredRecords}
                      selectedWeek={filters.week}
                      onSelectRecord={setInspectedRecord}
                      onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                    />
                  )}

                  {activeTab === 'operators' && (
                    <OperatorQueuesView
                      operatorQueues={workbook.operatorQueues}
                      masterRecords={workbook.masterRecords}
                      dashboardOperators={workbook.dashboardOperators}
                      selectedOperator={selectedOperatorQueue}
                      selectedWeek={filters.week}
                      onSelectOperator={setSelectedOperatorQueue}
                      onSelectRecord={setInspectedRecord}
                    />
                  )}

                  {activeTab === 'billing' && (
                    <BillingExceptionsView
                      records={filteredRecords}
                      stats={overviewStats}
                      selectedWeek={filters.week}
                      onSelectRecord={setInspectedRecord}
                    />
                  )}

                  {activeTab === 'dth' && (
                    <DthSonyView
                      dthLogs={workbook.dthLogs}
                      sonyDates={workbook.sonyDates}
                      sonyActivity={workbook.sonyActivity}
                      selectedWeek={filters.week}
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      <NetworkDrawer
        record={inspectedRecord}
        onClose={() => setInspectedRecord(null)}
      />
    </div>
  );
}
