import { useEffect } from 'react';
import { Calendar, Check, Cpu, IndianRupee, MapPin, Minus, User, X } from 'lucide-react';
import type { MasterNetworkRecord } from '../types/tracker';
import { formatCurrencyINR, getRecordLastVideoInfo } from '../utils/analytics';
import { BillingIndicator, NetworkTypeIndicator } from './StatusText';

interface NetworkDrawerProps {
  record: MasterNetworkRecord | null;
  monthScope?: 'oct2026' | 'nov2026';
  onClose: () => void;
}

export function NetworkDrawer({
  record,
  monthScope = 'nov2026',
  onClose,
}: NetworkDrawerProps) {
  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, onClose]);

  if (!record) return null;

  const weekChunks = [0, 1, 2, 3, 4].map((wkIdx) => ({
    weekLabel: `Week ${record.weeks[wkIdx]?.weekNumber ?? 40 + wkIdx}`,
    rangeLabel: record.weeks[wkIdx]?.rangeLabel ?? '',
    days: record.daily.slice(wkIdx * 7, wkIdx * 7 + 7),
  }));
  const firstWkNum = record.weeks[0]?.weekNumber ?? 40;
  const lastWkNum = record.weeks[4]?.weekNumber ?? firstWkNum + 4;
  const firstDateRange = record.weeks[0]?.rangeLabel.split('–')[0]?.trim() ?? '';
  const lastDateRange = record.weeks[4]?.rangeLabel.split('–')[1]?.trim() ?? '';
  const lastVideoInfo = getRecordLastVideoInfo(record, monthScope, 'ALL');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="relative z-10 w-full max-w-2xl bg-white border-l border-slate-200 h-full overflow-y-auto shadow-xl flex flex-col"
        aria-label="Network inspector"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 tabular-nums">
              <span>SR #{record.sr}</span>
              <span>·</span>
              <span className="font-semibold text-slate-700">{record.code}</span>
              <span>·</span>
              <span>{record.weekUpdate}</span>
              <span>·</span>
              <span>{record.category}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-1 leading-snug">
              {record.networkName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {record.city}, {record.state}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Operator: <strong className="font-semibold text-slate-800">{record.operationName}</strong>
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                {record.machineNo || 'NO BOX'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50">
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Network Type</div>
              <div className="mt-1.5">
                <NetworkTypeIndicator type={record.type} />
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">As Per Billing</div>
              <div className="mt-1.5">
                <BillingIndicator status={record.asPerBilling} />
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Last Video Received</div>
              <div className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-900">
                {lastVideoInfo.formattedDate}
              </div>
              {lastVideoInfo.weekLabel && (
                <div className="text-[11px] font-mono text-blue-700">
                  {lastVideoInfo.weekLabel}
                </div>
              )}
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Total Reported / Box</div>
              <div className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-900">
                {record.totalReported} <span className="text-slate-400 font-normal">/</span> {record.boxCount} wks
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Final Amount To Pay</div>
              <div className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-900 inline-flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                {formatCurrencyINR(record.finalAmountToPay).replace('₹', '')}
                <span className="text-xs font-normal text-slate-500">
                  ({record.budgetLabel})
                </span>
              </div>
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                {record.daily.length}-Day Daily Landing Matrix ({firstDateRange} – {lastDateRange})
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-600">
                {record.totalOnDays} / {record.daily.length} days ON
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
              {weekChunks.map((chunk) => (
                <div key={chunk.weekLabel} className="p-3 bg-white">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-800">{chunk.weekLabel}</span>
                    <span className="text-slate-500 font-mono">{chunk.rangeLabel}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {chunk.days.map((day) => (
                      <div
                        key={day.date}
                        className={`p-2 rounded border text-center ${
                          day.on
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="text-[10px] font-medium uppercase tracking-wide">
                          {day.dayName.slice(0, 3)}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums mt-0.5">
                          {day.date.replace('/2026', '')}
                        </div>
                        <div className="mt-1 flex justify-center">
                          {day.on ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Minus className="w-3 h-3 text-slate-300" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
              Weekly Verification Logs (Week {firstWkNum} – Week {lastWkNum})
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium">Week</th>
                    <th className="py-2 px-3 text-right font-medium">Box Days</th>
                    <th className="py-2 px-3 text-right font-medium">Videos</th>
                    <th className="py-2 px-3 text-left font-medium">Video Dates</th>
                    <th className="py-2 px-3 text-left font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {record.weeks.map((wk) => {
                    const dates = [wk.video1, wk.video2, wk.video3].filter(Boolean);
                    const combinedRemark = [wk.remark, wk.weekRemark]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <tr key={wk.weekNumber} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          WK{wk.weekNumber}{' '}
                          <span className="text-slate-400 font-normal">({wk.label})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {wk.boxCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {wk.videoCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                          {dates.length ? dates.join(', ') : wk.date || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {combinedRemark || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
            <div className="p-3">
              <div className="text-slate-500">Video Status</div>
              <div className="mt-1">
                <BillingIndicator status={record.videoStatus} />
              </div>
            </div>
            <div className="p-3">
              <div className="text-slate-500">Box Status</div>
              <div className="mt-1">
                <BillingIndicator status={record.boxStatus} />
              </div>
            </div>
            <div className="p-3">
              <div className="text-slate-500">Video Billing / Pay</div>
              <div className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                {record.videoBilling} / {record.videoPayment}
              </div>
            </div>
            <div className="p-3">
              <div className="text-slate-500">BARC Status</div>
              <div className="mt-1 font-mono tabular-nums font-medium text-slate-800">
                {record.barcStatus} ({record.barcVideoPayment})
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
