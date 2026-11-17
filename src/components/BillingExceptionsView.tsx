import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, IndianRupee } from 'lucide-react';
import type { MasterNetworkRecord, MonthScope, WeekFilter } from '../types/tracker';
import {
  type ComputedOverviewStats,
  formatCurrencyINR,
  formatNumber,
  getWeekIndex,
  getWeekMeta,
  getWeekOptionsForMonth,
} from '../utils/analytics';
import { BillingIndicator, NetworkTypeIndicator } from './StatusText';

interface BillingExceptionsViewProps {
  records: MasterNetworkRecord[];
  stats: ComputedOverviewStats;
  selectedWeek: WeekFilter;
  monthScope: MonthScope;
  onSelectRecord: (record: MasterNetworkRecord) => void;
}

type AuditScope = 'pending_billing' | 'payable' | 'exceptions' | 'not_to_pay';

export function BillingExceptionsView({
  records,
  stats,
  selectedWeek,
  monthScope,
  onSelectRecord,
}: BillingExceptionsViewProps) {
  const [scope, setScope] = useState<AuditScope>('pending_billing');
  const [selectedRemark, setSelectedRemark] = useState<string>('ALL');

  const weekIdx = getWeekIndex(selectedWeek);
  const weekMeta = getWeekMeta(selectedWeek, monthScope);
  const weekOpts = getWeekOptionsForMonth(monthScope);
  const cycleWkLabel = `${weekOpts[0].wkLabel} – ${weekOpts[4].wkLabel}`;

  const notToPayCount = useMemo(
    () =>
      records.filter((r) =>
        r.budgetLabel.toLowerCase().includes('not to pay'),
      ).length,
    [records],
  );

  const exceptionRecords = useMemo(() => {
    return records.filter((r) => {
      if (weekIdx !== null) {
        const w = r.weeks[weekIdx];
        return Boolean(w && (w.remark !== '' || w.weekRemark !== ''));
      }
      return r.weeks.some((w) => w.remark !== '' || w.weekRemark !== '');
    });
  }, [records, weekIdx]);

  const scopedRows = useMemo(() => {
    let base: MasterNetworkRecord[];
    if (scope === 'pending_billing') {
      base =
        weekIdx !== null
          ? records.filter((r) => (r.weeks[weekIdx]?.videoCount ?? 0) === 0)
          : records.filter((r) => r.asPerBilling === 'PENDING');
    } else if (scope === 'payable') {
      base =
        weekIdx !== null
          ? records
              .filter(
                (r) =>
                  (r.weeks[weekIdx]?.videoCount ?? 0) > 0 &&
                  !r.budgetLabel.toLowerCase().includes('not to pay'),
              )
              .sort(
                (a, b) =>
                  (b.weeks[weekIdx]?.videoCount ?? 0) -
                  (a.weeks[weekIdx]?.videoCount ?? 0),
              )
          : records
              .filter((r) => r.finalAmountToPay > 0)
              .sort((a, b) => b.finalAmountToPay - a.finalAmountToPay);
    } else if (scope === 'not_to_pay') {
      base = records.filter((r) =>
        r.budgetLabel.toLowerCase().includes('not to pay'),
      );
    } else {
      base = exceptionRecords;
    }

    if (selectedRemark !== 'ALL') {
      base = base.filter((r) => {
        if (weekIdx !== null) {
          const w = r.weeks[weekIdx];
          return (
            w?.remark.toUpperCase() === selectedRemark ||
            w?.weekRemark.toUpperCase() === selectedRemark
          );
        }
        return r.weeks.some(
          (w) =>
            w.remark.toUpperCase() === selectedRemark ||
            w.weekRemark.toUpperCase() === selectedRemark,
        );
      });
    }

    return base;
  }, [records, exceptionRecords, scope, selectedRemark, weekIdx]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {weekMeta ? `${weekMeta.wkLabel} Est. Payable` : 'Total Payable Amount'}
            </span>
            <IndianRupee className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrencyINR(
              weekMeta ? stats.activeWeekEstPayoutINR : stats.totalPayoutINR,
            )}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {weekMeta
              ? `${formatNumber(stats.activeWeekVideos)} ${weekMeta.wkLabel} videos · Cycle ${formatCurrencyINR(stats.totalPayoutINR)}`
              : `${formatNumber(records.filter((r) => r.finalAmountToPay > 0).length)} payable networks @ ₹15/video`}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{weekMeta ? `${weekMeta.wkLabel} Videos Done` : 'Billing Done'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {formatNumber(
              weekMeta
                ? records.filter((r) => (r.weeks[weekIdx!]?.videoCount ?? 0) > 0).length
                : stats.billingDoneCount,
            )}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {formatNumber(stats.videoYesCount)} Video YES · {formatNumber(stats.boxYesCount)} Box YES
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {weekMeta ? `${weekMeta.wkLabel} Pending Videos` : 'Billing Pending Audit'}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {formatNumber(
              weekMeta ? stats.activeWeekPendingVideos : stats.billingPendingCount,
            )}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            Includes offline, shutdown, and partial video networks
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {weekMeta ? `${weekMeta.wkLabel} Remarks` : 'Remarks & Exclusions'}
            </span>
            <span className="text-xs font-mono text-slate-400">Audit</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(exceptionRecords.length)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {notToPayCount} DTH “Not to pay” excluded rows
          </div>
        </div>
      </div>

      {stats.exceptionCounts.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Top Remark & Exception Tags ({weekMeta ? weekMeta.wkLabel : cycleWkLabel})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any remark label to filter the audit ledger below
              </p>
            </div>
            {selectedRemark !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedRemark('ALL')}
                className="text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
              >
                Clear remark filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {stats.exceptionCounts.map((item) => {
              const active = selectedRemark === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setScope('exceptions');
                    setSelectedRemark(active ? 'ALL' : item.label);
                  }}
                  className={`p-2.5 text-left rounded border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`text-[11px] font-mono truncate ${
                      active ? 'text-slate-200' : 'text-slate-600'
                    }`}
                    title={item.label}
                  >
                    {item.label}
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums mt-0.5">
                    {item.count}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200"
            role="group"
          >
            {(
              [
                {
                  id: 'pending_billing',
                  label: weekMeta ? `${weekMeta.wkLabel} Missing Video` : 'Billing Pending',
                },
                {
                  id: 'payable',
                  label: weekMeta ? `${weekMeta.wkLabel} Payable` : 'Payable Networks',
                },
                { id: 'exceptions', label: 'With Remarks' },
                { id: 'not_to_pay', label: 'Not To Pay (DTH)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                  scope === tab.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono tabular-nums text-slate-500">
            {scopedRows.length} matching records
          </div>
        </div>

        <div className="overflow-x-auto max-h-[540px]">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 text-left font-medium">SR</th>
                <th className="py-2.5 px-3 text-left font-medium">Code</th>
                <th className="py-2.5 px-3 text-left font-medium">Network Name</th>
                <th className="py-2.5 px-3 text-left font-medium">Operator</th>
                <th className="py-2.5 px-3 text-left font-medium">Type</th>
                <th className="py-2.5 px-3 text-left font-medium">
                  {weekMeta ? `${weekMeta.wkLabel} Box · Vid` : 'Video · Box'}
                </th>
                <th className="py-2.5 px-3 text-left font-medium">Billing</th>
                <th className="py-2.5 px-3 text-left font-medium">Remarks</th>
                <th className="py-2.5 px-3 text-right font-medium">
                  {weekMeta ? `${weekMeta.wkLabel} Pay` : 'Final Pay'}
                </th>
                <th className="py-2.5 px-3 text-right font-medium">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scopedRows.slice(0, 150).map((row) => {
                const wk = weekIdx !== null ? row.weeks[weekIdx] : null;
                const remarks = wk
                  ? [wk.remark, wk.weekRemark].filter(Boolean)
                  : Array.from(
                      new Set(
                        row.weeks
                          .flatMap((w) => [w.remark, w.weekRemark])
                          .filter(Boolean),
                      ),
                    );
                const weekPay =
                  wk && row.budget > 0 ? wk.videoCount * row.budget : 0;

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
                    <td className="py-2 px-3 font-medium text-slate-900 max-w-[240px] truncate">
                      {row.networkName}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700">
                      {row.operationName}
                    </td>
                    <td className="py-2 px-3">
                      <NetworkTypeIndicator type={row.type} />
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {wk
                        ? `${wk.boxCount}d · ${wk.videoCount}v`
                        : `${row.videoStatus} · ${row.boxStatus}`}
                    </td>
                    <td className="py-2 px-3">
                      <BillingIndicator status={row.asPerBilling} />
                    </td>
                    <td className="py-2 px-3 text-amber-800 max-w-[200px] truncate">
                      {remarks.length ? remarks.join(', ') : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {row.budgetLabel === 'Not to pay'
                        ? 'Not to pay'
                        : formatCurrencyINR(wk ? weekPay : row.finalAmountToPay)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(row);
                        }}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-medium cursor-pointer"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {scopedRows.length > 150 && (
            <div className="px-4 py-2.5 text-xs text-slate-500 bg-slate-50 border-t border-slate-200 font-mono">
              Showing first 150 of {scopedRows.length} matching records. Narrow down with top filters or remarks.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
