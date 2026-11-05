import React from 'react';
import {
  X,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Calendar,
  Layers,
  FileSpreadsheet,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import { ScheduledRunLog } from '../types';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  istTime: string;
  istDate: string;
  nextSlotLabel: string;
  nextSlotSeconds: number;
  scheduledSlots: string[];
  activeCount: number;
  logs: ScheduledRunLog[];
  onTriggerCheckNow: () => Promise<void>;
  isChecking: boolean;
  onOpenEmailModal?: () => void;
  expiringIn4DaysCount?: number;
  recipientEmail?: string;
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  istTime,
  istDate,
  nextSlotLabel,
  nextSlotSeconds,
  scheduledSlots,
  activeCount,
  logs,
  onTriggerCheckNow,
  isChecking,
  onOpenEmailModal,
  expiringIn4DaysCount = 0,
  recipientEmail = 'ashwini.poojary@homesfy.in',
}) => {
  if (!isOpen) return null;

  const formatCountdown = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Automated Routine SSL Check &amp; Email Alert
              </h2>
              <p className="text-xs text-slate-500">
                Syncs latest domain list from sheet, checks all sites (except Suspended &amp; Expired), and emails expiring sites in next 4 days to {recipientEmail}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Routine Workflow Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-100 block">1. Sheet Auto-Sync</span>
                <span className="text-[11px] text-slate-400">Pulls latest domains &amp; statuses prior to each check</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-100 block">2. Filtered Scan</span>
                <span className="text-[11px] text-slate-400">Checks all sites (except Suspended &amp; Expired)</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-100 block">3. Email Alert</span>
                <span className="text-[11px] text-slate-400">Emails sites expiring in ≤ 4 days to {recipientEmail}</span>
              </div>
            </div>
          </div>

          {/* Real-time IST Status Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Indian Standard Time (IST) Clock
              </span>
              <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
                <span>{istTime}</span>
                <span className="text-xs text-slate-400 font-sans">{istDate}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Next scheduled routine check:{' '}
                <strong className="text-slate-200">{nextSlotLabel}</strong> in{' '}
                <span className="text-emerald-400 font-mono font-medium">
                  {formatCountdown(nextSlotSeconds)}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={onTriggerCheckNow}
                disabled={isChecking}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Running Routine...' : 'Run Routine Check Now'}</span>
              </button>

              {onOpenEmailModal && (
                <button
                  onClick={onOpenEmailModal}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg transition-all text-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Email Alerts ({expiringIn4DaysCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Schedule Rules Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scheduledSlots.map((slot, idx) => (
              <div
                key={slot}
                className={`p-3 rounded-xl border ${
                  nextSlotLabel === slot
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Slot {idx + 1}
                  </span>
                  {nextSlotLabel === slot && (
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                      Upcoming
                    </span>
                  )}
                </div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {slot}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Syncs sheet + checks all non-suspended/expired
                </span>
              </div>
            ))}
          </div>

          {/* Execution History */}
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>Recent Routine Check Runs</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Continuous 24/7 background execution
              </span>
            </h3>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-center py-6">
                  No execution logs recorded yet.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {log.slot}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Checked {log.checkedCount} domains in {(log.durationMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(log.runAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {log.validCount} valid
                      </span>
                      {log.expiringCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {log.expiringCount} soon
                        </span>
                      )}
                      {typeof log.expiringIn4DaysCount === 'number' && log.expiringIn4DaysCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-semibold">
                          <Mail className="w-3 h-3" />
                          {log.expiringIn4DaysCount} in ≤4d
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
