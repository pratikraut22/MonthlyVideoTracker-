import { useMemo, useState } from 'react';
import { ExternalLink, Search, Users } from 'lucide-react';
import type {
  DashboardOperatorSummary,
  MasterNetworkRecord,
  OperatorPendingRow,
  WeekFilter,
} from '../types/tracker';
import {
  formatCurrencyINR,
  getWeekIndex,
  getWeekMeta,
} from '../utils/analytics';
import { BillingIndicator, NetworkTypeIndicator } from './StatusText';

interface OperatorQueuesViewProps {
  operatorQueues: Record<string, OperatorPendingRow[]>;
  masterRecords: MasterNetworkRecord[];
  dashboardOperators: DashboardOperatorSummary[];
  selectedOperator: string;
  selectedWeek: WeekFilter;
  onSelectOperator: (op: string) => void;
  onSelectRecord: (record: MasterNetworkRecord) => void;
}

export function OperatorQueuesView({
  operatorQueues,
  masterRecords,
  dashboardOperators,
  selectedOperator,
  selectedWeek,
  onSelectOperator,
  onSelectRecord,
}: OperatorQueuesViewProps) {
  const [search, setSearch] = useState('');
  const [sourceMode, setSourceMode] = useState<'pending_sheet' | 'master_all'>(
    'pending_sheet',
  );
  const [weekStatusFilter, setWeekStatusFilter] = useState<'all' | 'done' | 'missing'>('all');

  const weekIdx = getWeekIndex(selectedWeek);
  const weekMeta = getWeekMeta(selectedWeek);

  const queueKeys = useMemo(() => {
    const keys = Object.keys(operatorQueues).sort();
    const extraOps = Array.from(
      new Set(masterRecords.map((r) => r.operationName).filter(Boolean)),
    )
      .filter((op) => !keys.includes(op))
      .sort();
    return [...keys, ...extraOps];
  }, [operatorQueues, masterRecords]);

  const activeOp = queueKeys.includes(selectedOperator)
    ? selectedOperator
    : queueKeys[0] ?? '';

  const masterByCode = useMemo(() => {
    const map = new Map<string, MasterNetworkRecord>();
    for (const r of masterRecords) {
      if (r.code) map.set(`${r.code}::${r.networkName}`, r);
      if (r.code && !map.has(r.code)) map.set(r.code, r);
    }
    return map;
  }, [masterRecords]);

  const opMasterRecords = useMemo(
    () => masterRecords.filter((r) => r.operationName === activeOp),
    [masterRecords, activeOp],
  );

  const pendingSheetRows = operatorQueues[activeOp] ?? [];

  const dashSummary = useMemo(
    () => dashboardOperators.find((d) => d.operationName === activeOp),
    [dashboardOperators, activeOp],
  );

  const opMetrics = useMemo(() => {
    let online = 0;
    let offline = 0;
    let billingDone = 0;
    let payout = 0;
    let videos = 0;
    let weekVideos = 0;
    let weekBoxActive = 0;
    let weekMissing = 0;
    let weekPayout = 0;

    for (const r of opMasterRecords) {
      if (r.type === 'ONLINE') online++;
      else if (r.type === 'OFFLINE') offline++;
      if (r.asPerBilling === 'DONE') billingDone++;
      payout += r.finalAmountToPay;
      videos += r.videoPayment;

      if (weekIdx !== null) {
        const w = r.weeks[weekIdx];
        if (w) {
          if (w.boxCount > 0) weekBoxActive++;
          if (w.videoCount > 0) {
            weekVideos += w.videoCount;
            weekPayout += w.videoCount * (r.budget > 0 ? r.budget : 0);
          } else {
            weekMissing++;
          }
        }
      }
    }

    return {
      total: opMasterRecords.length,
      online,
      offline,
      billingDone,
      payout,
      videos,
      weekVideos,
      weekBoxActive,
      weekMissing,
      weekPayout,
    };
  }, [opMasterRecords, weekIdx]);

  const q = search.trim().toLowerCase();

  const visiblePendingRows = useMemo(() => {
    return pendingSheetRows.filter((item) => {
      if (q) {
        const hay = `${item.code} ${item.networkName} ${item.city} ${item.state} ${item.weekUpdate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (weekIdx !== null && weekStatusFilter !== 'all') {
        const matched =
          masterByCode.get(`${item.code}::${item.networkName}`) ??
          masterByCode.get(item.code);
        const wCount = matched?.weeks[weekIdx]?.videoCount ?? 0;
        if (weekStatusFilter === 'done' && wCount === 0) return false;
        if (weekStatusFilter === 'missing' && wCount > 0) return false;
      }
      return true;
    });
  }, [pendingSheetRows, q, weekIdx, weekStatusFilter, masterByCode]);

  const visibleMasterRows = useMemo(() => {
    return opMasterRecords.filter((item) => {
      if (q) {
        const hay = `${item.code} ${item.networkName} ${item.city} ${item.state} ${item.machineNo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (weekIdx !== null && weekStatusFilter !== 'all') {
        const wCount = item.weeks[weekIdx]?.videoCount ?? 0;
        if (weekStatusFilter === 'done' && wCount === 0) return false;
        if (weekStatusFilter === 'missing' && wCount > 0) return false;
      }
      return true;
    });
  }, [opMasterRecords, q, weekIdx, weekStatusFilter]);

  const showPendingSheet =
    sourceMode === 'pending_sheet' && pendingSheetRows.length > 0;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-3.5">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500" />
            Select Operator Worksheet
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {Object.keys(operatorQueues).length} pending sheets · {queueKeys.length} total operators
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {queueKeys.map((op) => {
            const qCount = operatorQueues[op]?.length ?? 0;
            const mCount = masterRecords.filter((r) => r.operationName === op).length;
            const active = op === activeOp;
            return (
              <button
                key={op}
                type="button"
                onClick={() => onSelectOperator(op)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{op}</span>{' '}
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    active ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {qCount > 0 ? `${qCount}q` : `${mCount}m`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-3.5">
          <div className="text-xs text-slate-500">Operator & Markets</div>
          <div className="mt-1 text-base font-bold text-slate-900">{activeOp}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
            {dashSummary?.markets || 'Master Roster'}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500">
            {weekMeta ? `${weekMeta.wkLabel} Box Active` : 'Assigned Networks'}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
            {weekMeta ? opMetrics.weekBoxActive : opMetrics.total}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
            {weekMeta
              ? `of ${opMetrics.total} assigned`
              : `${opMetrics.online} online · ${opMetrics.offline} offline`}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500">
            {weekMeta ? `${weekMeta.wkLabel} Missing Video` : 'Pending Sheet Rows'}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-700">
            {weekMeta ? opMetrics.weekMissing : pendingSheetRows.length}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
            {weekMeta
              ? `${pendingSheetRows.length} in pending sheet`
              : dashSummary
                ? `${dashSummary.pendingCurrentNetwork} pending videos`
                : 'Master queue'}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500">
            {weekMeta ? `${weekMeta.wkLabel} Videos` : 'Billing Done'}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700">
            {weekMeta ? opMetrics.weekVideos : opMetrics.billingDone}
            <span className="text-xs font-normal text-slate-400">
              {' '}
              / {opMetrics.total}
            </span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
            {opMetrics.videos} total cycle videos
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500">
            {weekMeta ? `${weekMeta.wkLabel} Est. Payout` : 'Operator Payout'}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrencyINR(weekMeta ? opMetrics.weekPayout : opMetrics.payout)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
            {weekMeta
              ? `Cycle: ${formatCurrencyINR(opMetrics.payout)}`
              : '@ ₹15 / video'}
          </div>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200"
              role="group"
            >
              <button
                type="button"
                disabled={pendingSheetRows.length === 0}
                onClick={() => setSourceMode('pending_sheet')}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                  showPendingSheet
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Operator Pending Sheet ({pendingSheetRows.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('master_all')}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                  !showPendingSheet
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Master Assignments ({opMasterRecords.length})
              </button>
            </div>

            {weekMeta && (
              <div
                className="inline-flex items-center bg-blue-50/70 p-0.5 rounded-md border border-blue-200/80"
                role="group"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'done', label: `${weekMeta.shortLabel} Video Done` },
                    { id: 'missing', label: `${weekMeta.shortLabel} Missing` },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWeekStatusFilter(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                      weekStatusFilter === opt.id
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

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${activeOp} networks...`}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {showPendingSheet ? (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 text-left font-medium">SR</th>
                  <th className="py-2.5 px-3 text-left font-medium">Code</th>
                  <th className="py-2.5 px-3 text-left font-medium">Network Name</th>
                  <th className="py-2.5 px-3 text-left font-medium">State · City</th>
                  <th className="py-2.5 px-3 text-left font-medium">Program</th>
                  <th className="py-2.5 px-3 text-left font-medium">Live Master Type</th>
                  {weekMeta && (
                    <th className="py-2.5 px-3 text-left font-medium">
                      {weekMeta.wkLabel} Box · Vid
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-left font-medium">Billing Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visiblePendingRows.map((item, idx) => {
                  const matched =
                    masterByCode.get(`${item.code}::${item.networkName}`) ??
                    masterByCode.get(item.code);
                  const wk = weekIdx !== null && matched ? matched.weeks[weekIdx] : null;
                  return (
                    <tr
                      key={`${item.code}-${idx}`}
                      onClick={() => matched && onSelectRecord(matched)}
                      className={
                        matched
                          ? 'hover:bg-slate-50 cursor-pointer'
                          : 'bg-white'
                      }
                    >
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                        {item.srNo}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-800">
                        {item.code}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.networkName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {item.state} · {item.city}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {item.weekUpdate}
                      </td>
                      <td className="py-2 px-3">
                        {matched ? (
                          <NetworkTypeIndicator type={matched.type} />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      {weekMeta && (
                        <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                          {wk ? (
                            <span>
                              {wk.boxCount}d ·{' '}
                              <strong className={wk.videoCount > 0 ? 'text-blue-700' : 'text-slate-400'}>
                                {wk.videoCount}v
                              </strong>
                              {wk.remark ? ` (${wk.remark})` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td className="py-2 px-3">
                        {matched ? (
                          <BillingIndicator status={matched.asPerBilling} />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {matched ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRecord(matched);
                            }}
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-medium cursor-pointer"
                          >
                            Master <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400">Sheet only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 text-left font-medium">SR</th>
                  <th className="py-2.5 px-3 text-left font-medium">Code</th>
                  <th className="py-2.5 px-3 text-left font-medium">Network Name</th>
                  <th className="py-2.5 px-3 text-left font-medium">State · City</th>
                  <th className="py-2.5 px-3 text-left font-medium">Type</th>
                  <th className="py-2.5 px-3 text-left font-medium">Program</th>
                  <th className="py-2.5 px-3 text-right font-medium">
                    {weekMeta ? `${weekMeta.wkLabel} Box` : 'Reported'}
                  </th>
                  <th className="py-2.5 px-3 text-right font-medium">
                    {weekMeta ? `${weekMeta.wkLabel} Vid` : 'Videos'}
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium">Billing</th>
                  <th className="py-2.5 px-3 text-right font-medium">Pay ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleMasterRows.map((row) => {
                  const wk = weekIdx !== null ? row.weeks[weekIdx] : null;
                  return (
                    <tr
                      key={`${row.sr}-${row.code}`}
                      onClick={() => onSelectRecord(row)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                        {row.sr}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-800">
                        {row.code}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {row.networkName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {row.state} · {row.city}
                      </td>
                      <td className="py-2 px-3">
                        <NetworkTypeIndicator type={row.type} />
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {row.weekUpdate}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {wk ? `${wk.boxCount}d` : row.totalReported}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                        {wk ? wk.videoCount : row.videoPayment}
                      </td>
                      <td className="py-2 px-3">
                        <BillingIndicator status={row.asPerBilling} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrencyINR(row.finalAmountToPay)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
