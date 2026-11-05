import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { DashboardStats } from '../types';

interface AttentionBannerProps {
  stats: DashboardStats;
  onFilterAttention: () => void;
  isAttentionFiltered: boolean;
  expiringIn4DaysCount?: number;
  onFilterExpiring4Days?: () => void;
  isExpiring4DaysFiltered?: boolean;
}

export const AttentionBanner: React.FC<AttentionBannerProps> = ({
  stats,
  onFilterAttention,
  isAttentionFiltered,
  expiringIn4DaysCount = 0,
  onFilterExpiring4Days,
  isExpiring4DaysFiltered = false,
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || stats.attentionRequiredCount === 0) {
    return null;
  }

  return (
    <div
      id="attention-alert-banner"
      className="mb-6 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-gradient-to-r from-rose-50 via-rose-100/60 to-amber-50 dark:from-rose-950/40 dark:via-rose-900/20 dark:to-amber-950/20 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="shrink-0 p-2 rounded-lg bg-rose-500 text-white shadow-sm mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                Action Required: {stats.attentionRequiredCount} Domain(s) Need Attention
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                Critical Alert
              </span>
            </div>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 max-w-3xl leading-relaxed">
              Found{' '}
              {stats.sslExpired > 0 && (
                <strong className="font-semibold text-rose-900 dark:text-rose-100">
                  {stats.sslExpired} expired SSL certificate(s)
                </strong>
              )}
              {stats.sslExpired > 0 && stats.sslFailed > 0 && ', '}
              {stats.sslFailed > 0 && (
                <strong className="font-semibold text-rose-900 dark:text-rose-100">
                  {stats.sslFailed} SSL connection/handshake error(s)
                </strong>
              )}
              {(stats.sslExpired > 0 || stats.sslFailed > 0) && stats.sslExpiringSoon > 0 && ', and '}
              {stats.sslExpiringSoon > 0 && (
                <strong className="font-semibold text-amber-900 dark:text-amber-200">
                  {stats.sslExpiringSoon} certificate(s) expiring within 15 days
                </strong>
              )}
              . Real estate landing pages with failed certificates drop conversion and risk ad account suspension.
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                id="btn-filter-attention-banner"
                onClick={onFilterAttention}
                className={`inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm ${
                  isAttentionFiltered
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <span>{isAttentionFiltered ? 'Showing Attention Items' : 'Filter Attention Required'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onFilterExpiring4Days && expiringIn4DaysCount > 0 && (
                <button
                  id="btn-filter-expiring-4d-banner"
                  onClick={onFilterExpiring4Days}
                  className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm ${
                    isExpiring4DaysFiltered
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400/40'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                  }`}
                  title="Filter table to sites expiring in next 4 days"
                >
                  <span>🚨 Expiring in 4 Days ({expiringIn4DaysCount})</span>
                </button>
              )}

              <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                Active campaigns are auto-monitored at 10:30, 14:30, and 18:00 IST
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-rose-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-200/50 dark:hover:bg-rose-900/40 transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
