import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  PowerOff,
  Radio,
} from 'lucide-react';
import type { BillingStatus, NetworkType } from '../types/tracker';

export function NetworkTypeIndicator({ type }: { type: NetworkType }) {
  if (type === 'ONLINE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        ONLINE
      </span>
    );
  }
  if (type === 'OFFLINE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        OFFLINE
      </span>
    );
  }
  if (type === 'SHUTDOWN') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <PowerOff className="w-3.5 h-3.5 text-red-600 shrink-0" />
        SHUTDOWN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <PauseCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      ON HOLD
    </span>
  );
}

export function BillingIndicator({ status }: { status: BillingStatus | string }) {
  const isDone = status === 'DONE' || status === 'YES';
  if (isDone) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      {status || 'PENDING'}
    </span>
  );
}
