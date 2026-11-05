import React from 'react';
import {
  ShieldCheck,
  Clock,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Sun,
  Mail,
} from 'lucide-react';
import { GoogleSheetConfig, ProjectRecord } from '../types';

interface HeaderProps {
  istTime: string;
  nextSlotLabel: string;
  nextSlotSeconds: number;
  activeCount: number;
  isCheckingNow: boolean;
  onTriggerBatchCheck: () => void;
  onOpenAddModal: () => void;
  onOpenSyncModal: () => void;
  onOpenEmailModal?: () => void;
  onFilterExpiring4Days?: () => void;
  isExpiring4DaysFiltered?: boolean;
  expiringIn4DaysCount?: number;
  sheetConfig: GoogleSheetConfig | null;
  attentionCount: number;
  projects: ProjectRecord[];
  onOpenNotificationDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  istTime,
  nextSlotLabel,
  nextSlotSeconds,
  activeCount,
  isCheckingNow,
  onTriggerBatchCheck,
  onOpenAddModal,
  onOpenSyncModal,
  onOpenSchedulerModal,
  onOpenEmailModal,
  onFilterExpiring4Days,
  isExpiring4DaysFiltered = false,
  expiringIn4DaysCount = 0,
  sheetConfig,
  attentionCount,
  onOpenNotificationDrawer,
}) => {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    return typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const formatCountdown = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white transition-all shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white font-sans">
                  CertPulse
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                  Real Estate SSL
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Automated TLS & Google Sheets Campaign Monitor
              </p>
            </div>
          </div>

          {/* Center IST Live Schedule Clock */}
          <div
            onClick={onOpenSchedulerModal}
            className="hidden md:flex items-center space-x-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-inner group"
            title="Click to view automated IST schedule details"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>{istTime || 'Loading IST...'}</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-[11px] text-slate-400 group-hover:text-emerald-300 transition-colors">
                  Next Check: <span className="font-medium text-slate-300">{nextSlotLabel}</span>{' '}
                  <span className="text-slate-500 font-mono">({formatCountdown(nextSlotSeconds)})</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-slate-700/80 px-2 py-0.5 rounded text-slate-300 font-medium">
              Daily 10:30, 2:30, 6:00 IST
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Google Sheet Sync Status Button */}
            <button
              id="btn-google-sheet-sync"
              onClick={onOpenSyncModal}
              className="relative flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
              title="Google Sheet Integration & Live Sync"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Excel &amp; Sheet Sync</span>
              {sheetConfig?.syncStatus === 'synced' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" title="Synced" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Needs Sync" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              id="btn-notifications"
              onClick={onOpenNotificationDrawer}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="View SSL Alerts & Critical Items"
            >
              <Bell className="w-4 h-4" />
              {attentionCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-rose-500 text-white ring-2 ring-slate-900">
                  {attentionCount}
                </span>
              )}
            </button>

            {/* Direct Filter: Expiring in 4 Days button */}
            {onFilterExpiring4Days && (
              <button
                id="btn-header-expiring-4d"
                onClick={onFilterExpiring4Days}
                className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg border transition-all shadow-sm ${
                  isExpiring4DaysFiltered
                    ? 'bg-rose-600 border-rose-500 text-white shadow-md ring-2 ring-rose-400/50'
                    : 'bg-rose-950/70 hover:bg-rose-900 border-rose-800 text-rose-200 hover:text-white'
                }`}
                title="Filter table to sites expiring in next 4 days (Routine Email Alert sites)"
              >
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Expiring ≤ 4d</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-bold text-[10px] ${
                    isExpiring4DaysFiltered
                      ? 'bg-white text-rose-700'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {expiringIn4DaysCount}
                </span>
              </button>
            )}

            {/* Email Alerts Button (Expiring in 4 days) */}
            {onOpenEmailModal && (
              <button
                id="btn-email-alerts"
                onClick={onOpenEmailModal}
                className="relative flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
                title="Email SSL Expiration Alerts (ashwini.poojary@homesfy.in)"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Email Alerts</span>
              </button>
            )}

            {/* Dark Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isDark ? 'Dark theme active (Click to switch)' : 'Light theme active (Click to switch)'}
            >
              {isDark ? (
                <Moon className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Routine SSL Check Button (Syncs sheet + checks all sites except Suspended/Expired + emails expiring in 4 days) */}
            <button
              id="btn-batch-ssl-check"
              onClick={onTriggerBatchCheck}
              disabled={isCheckingNow}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm ${
                isCheckingNow
                  ? 'bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white shadow-md'
              }`}
              title="Syncs latest sheet list, checks SSL of all sites (except Suspended & Expired), and emails sites expiring in 4 days to ashwini.poojary@homesfy.in"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNow ? 'animate-spin text-emerald-300' : 'text-white'}`} />
              <span className="hidden sm:inline">
                {isCheckingNow ? 'Routine Running...' : 'Routine SSL Check'}
              </span>
            </button>

            {/* Add New Project Button (Primary Action) */}
            <button
              id="btn-add-new-project"
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
