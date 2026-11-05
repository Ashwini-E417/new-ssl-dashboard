import React from 'react';
import {
  Globe,
  Radio,
  CheckCircle,
  AlertOctagon,
  Clock,
  QrCode,
  TrendingUp,
} from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsOverviewProps {
  stats: DashboardStats;
  onFilterSelect: (filterType: string, value: string) => void;
  activeFilter: string;
  expiringIn4DaysCount?: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  onFilterSelect,
  activeFilter,
  expiringIn4DaysCount = 0,
}) => {
  const healthPercent =
    stats.totalProjects > 0
      ? Math.round((stats.sslValid / stats.totalProjects) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {/* Total Projects */}
      <div
        id="stat-total-projects"
        onClick={() => onFilterSelect('all', 'ALL')}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          activeFilter === 'ALL'
            ? 'ring-2 ring-slate-800 dark:ring-slate-400 border-transparent'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Monitored
          </span>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Globe className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {stats.totalProjects}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Domains</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          From Sheet CSV
        </p>
      </div>

      {/* Active Campaigns */}
      <div
        id="stat-active-campaigns"
        onClick={() => onFilterSelect('campaignStatus', 'Active')}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          activeFilter === 'Active'
            ? 'ring-2 ring-emerald-500 border-transparent'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Active Campaigns
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {stats.activeCampaigns}
          </span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Auto-checked
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          10:30, 2:30, 6:00 IST
        </p>
      </div>

      {/* Valid / Healthy SSL */}
      <div
        id="stat-ssl-valid"
        onClick={() => onFilterSelect('sslStatus', 'valid')}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          activeFilter === 'valid'
            ? 'ring-2 ring-teal-500 border-transparent'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            SSL Healthy
          </span>
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {stats.sslValid}
          </span>
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
            {healthPercent}%
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          Valid &gt; 15 days
        </p>
      </div>

      {/* Attention Required */}
      <div
        id="stat-attention-required"
        onClick={() => onFilterSelect('sslStatus', 'attention')}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          activeFilter === 'attention'
            ? 'ring-2 ring-rose-500 border-transparent'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Attention Required
          </span>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {stats.attentionRequiredCount}
          </span>
          <span className="text-[11px] text-rose-600 font-medium">Critical</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          {stats.sslExpired} expired, {stats.sslFailed} failed
        </p>
      </div>

      {/* Expiring Soon */}
      <div
        id="stat-expiring-soon"
        onClick={() => onFilterSelect('sslStatus', 'expiring_soon')}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          activeFilter === 'expiring_soon'
            ? 'ring-2 ring-amber-500 border-transparent'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Expiring &lt; 15 Days
          </span>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {stats.sslExpiringSoon}
          </span>
          <span className="text-[11px] text-amber-600 font-medium">Needs renewal</span>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onFilterSelect('daysRemainingFilter', '4');
          }}
          className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between hover:text-rose-600 transition-colors cursor-pointer group/pill"
          title="Click to filter sites expiring in next 4 days (Routine email alert threshold)"
        >
          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 group-hover/pill:underline">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            ≤ 4d Alerts:
          </span>
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60">
            {expiringIn4DaysCount}
          </span>
        </div>
      </div>

      {/* RERA QR Status Issues */}
      <div
        id="stat-rera-issues"
        onClick={() => onFilterSelect('reraIssues', 'active_broken')}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          activeFilter === 'active_broken'
            ? 'ring-2 ring-purple-500 border-transparent'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            QR Not Working
          </span>
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <QrCode className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
            {stats.reraIssuesCount}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Non-critical</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          Active campaign QR notices
        </p>
      </div>
    </div>
  );
};
