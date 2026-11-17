import { RotateCcw, Search } from 'lucide-react';
import type {
  BillingStatus,
  NetworkCategory,
  NetworkType,
  TrackerFilters,
  WeekUpdateProgram,
} from '../types/tracker';

interface FilterBarProps {
  filters: TrackerFilters;
  onChange: (next: TrackerFilters) => void;
  onReset: () => void;
  operators: string[];
  states: string[];
  totalCount: number;
  filteredCount: number;
}

const TYPE_OPTIONS: Array<{ value: 'ALL' | NetworkType; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'SHUTDOWN', label: 'Shutdown' },
  { value: 'ON HOLD', label: 'On Hold' },
];

export function FilterBar({
  filters,
  onChange,
  onReset,
  operators,
  states,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.week !== 'ALL' ||
    filters.search !== '' ||
    filters.operator !== 'ALL' ||
    filters.state !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.category !== 'ALL' ||
    filters.program !== 'ALL' ||
    filters.billing !== 'ALL';

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search network, code, city, machine..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div
          className="inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200"
          role="group"
          aria-label="Filter by network type"
        >
          {TYPE_OPTIONS.map((opt) => {
            const active = filters.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, type: opt.value })}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <select
          aria-label="Filter by operator"
          value={filters.operator}
          onChange={(e) => onChange({ ...filters, operator: e.target.value })}
          className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
        >
          <option value="ALL">All Operators</option>
          {operators.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by state"
          value={filters.state}
          onChange={(e) => onChange({ ...filters, state: e.target.value })}
          className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer max-w-[170px]"
        >
          <option value="ALL">All States</option>
          {states.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) =>
            onChange({
              ...filters,
              category: e.target.value as 'ALL' | NetworkCategory,
            })
          }
          className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          <option value="CATEGORY A">Category A</option>
          <option value="CATEGORY B">Category B</option>
          <option value="OTHERS">Others</option>
        </select>

        <select
          aria-label="Filter by program"
          value={filters.program}
          onChange={(e) =>
            onChange({
              ...filters,
              program: e.target.value as 'ALL' | WeekUpdateProgram,
            })
          }
          className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
        >
          <option value="ALL">All Programs</option>
          <option value="BARC">BARC</option>
          <option value="STAR">STAR</option>
          <option value="OTHERS">OTHERS</option>
          <option value="SHUTDOWN">SHUTDOWN</option>
        </select>

        <select
          aria-label="Filter by billing status"
          value={filters.billing}
          onChange={(e) =>
            onChange({
              ...filters,
              billing: e.target.value as 'ALL' | BillingStatus,
            })
          }
          className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
        >
          <option value="ALL">All Billing</option>
          <option value="DONE">Billing Done</option>
          <option value="PENDING">Billing Pending</option>
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <div className="tabular-nums">
          Showing <span className="font-semibold text-slate-900">{filteredCount}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalCount}</span> master network records
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
