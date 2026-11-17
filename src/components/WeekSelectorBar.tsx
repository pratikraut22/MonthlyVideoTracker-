import { Calendar, Layers } from 'lucide-react';
import type { MonthScope, WeekFilter } from '../types/tracker';
import { getWeekMeta, getWeekOptionsForMonth } from '../utils/analytics';

interface WeekSelectorBarProps {
  selectedWeek: WeekFilter;
  onSelectWeek: (week: WeekFilter) => void;
  monthScope: MonthScope;
  onSelectMonthScope: (scope: MonthScope) => void;
  hasNovember: boolean;
  hasOctober: boolean;
  novCount?: number;
  octCount?: number;
  novActiveWeekHint?: string;
  cycleRangeLabel?: string;
}

export function WeekSelectorBar({
  selectedWeek,
  onSelectWeek,
  monthScope,
  onSelectMonthScope,
  hasNovember,
  hasOctober,
  novCount = 0,
  octCount = 0,
  novActiveWeekHint = 'W3',
  cycleRangeLabel,
}: WeekSelectorBarProps) {
  const weekOptions = getWeekOptionsForMonth(monthScope);
  const activeMeta = getWeekMeta(selectedWeek, monthScope);
  const isNov = monthScope === 'nov2026';

  const fallbackRange = isNov
    ? 'Nov 2 – Dec 6, 2026 (35 days)'
    : 'Sep 28 – Nov 1, 2026 (35 days)';

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {hasNovember && hasOctober && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Month
            </span>
            <div
              className="inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 gap-0.5"
              role="group"
              aria-label="Select workbook month"
            >
              <button
                type="button"
                onClick={() => onSelectMonthScope('nov2026')}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isNov
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nov 2026{' '}
                <span className={isNov ? 'text-emerald-300 font-mono' : 'text-slate-400 font-mono'}>
                  · {novCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMonthScope('oct2026')}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  !isNov
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Oct 2026{' '}
                <span className={!isNov ? 'text-slate-300 font-mono' : 'text-slate-400 font-mono'}>
                  · {octCount}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Week Scope
          </span>

          <div
            className="inline-flex flex-wrap items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 gap-0.5"
            role="group"
            aria-label="Filter all pages by week"
          >
            <button
              type="button"
              onClick={() => onSelectWeek('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedWeek === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Weeks (W1–W5)
            </button>

            {weekOptions.map((wk) => {
              const active = selectedWeek === wk.value;
              const isFutureNovWeek = isNov && wk.index >= 3;
              return (
                <button
                  key={wk.value}
                  type="button"
                  onClick={() => onSelectWeek(wk.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isFutureNovWeek
                        ? 'text-slate-400 hover:text-slate-700'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="font-mono">{wk.shortLabel}</span>
                  <span className={active ? 'text-slate-300' : 'text-slate-400'}>
                    {' '}
                    · {wk.wkLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
        {activeMeta ? (
          <span>
            Active Window:{' '}
            <strong className="text-slate-900">{activeMeta.rangeLabel}, 2026</strong>
            {isNov && activeMeta.index >= 3 ? ' (Upcoming)' : ''}
          </span>
        ) : (
          <span>
            Full Cycle: {cycleRangeLabel || fallbackRange}
            {isNov && novActiveWeekHint ? ` · ${novActiveWeekHint} Live` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
