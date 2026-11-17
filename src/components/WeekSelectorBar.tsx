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
    <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3.5">
        {hasNovember && hasOctober && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Month
            </span>
            <div
              className="inline-flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 gap-0.5"
              role="group"
              aria-label="Select workbook month"
            >
              <button
                type="button"
                onClick={() => onSelectMonthScope('nov2026')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isNov
                    ? 'bg-[#0B1222] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nov 2026{' '}
                <span className={isNov ? 'text-blue-300 font-mono' : 'text-slate-400 font-mono'}>
                  · {novCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMonthScope('oct2026')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  !isNov
                    ? 'bg-[#0B1222] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Oct 2026{' '}
                <span className={!isNov ? 'text-blue-300 font-mono' : 'text-slate-400 font-mono'}>
                  · {octCount}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Week Scope
          </span>

          <div
            className="inline-flex flex-wrap items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 gap-0.5"
            role="group"
            aria-label="Filter all pages by week"
          >
            <button
              type="button"
              onClick={() => onSelectWeek('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedWeek === 'ALL'
                  ? 'bg-blue-600 text-white'
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : isFutureNovWeek
                        ? 'text-slate-400 hover:text-slate-700'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="font-mono">{wk.shortLabel}</span>
                  <span className={active ? 'text-blue-100' : 'text-slate-400'}>
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
            Showing{' '}
            <strong className="text-slate-900">{activeMeta.wkLabel}</strong> ·{' '}
            <span className="text-slate-700">{activeMeta.rangeLabel}, 2026</span>
            {isNov && activeMeta.index >= 3 ? ' (Upcoming)' : ''}
          </span>
        ) : (
          <span>
            Cycle: {cycleRangeLabel || fallbackRange}
            {isNov && novActiveWeekHint ? ` · ${novActiveWeekHint} Live` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
