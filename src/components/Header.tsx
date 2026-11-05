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
  LayoutDashboard,
  List,
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
  onOpenSchedulerModal: () => void;
  onOpenEmailModal?: () => void;
  onFilterExpiring4Days?: () => void;
  isExpiring4DaysFiltered?: boolean;
  expiringIn4DaysCount?: number;
  sheetConfig: GoogleSheetConfig | null;
  attentionCount: number;
  projects: ProjectRecord[];
  onOpenNotificationDrawer: () => void;
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  totalProjects: number;
}

export type DashboardPage = 'overview' | 'projects';

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
  activePage,
  onNavigate,
  totalProjects,
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

  const iconBtn =
    'relative inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors';

  const tabs: { id: DashboardPage; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects', icon: <List className="w-4 h-4" />, badge: totalProjects },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      {/* Row 1: brand, live schedule clock, utility icons */}
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex shrink-0 items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white">CertPulse</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                  Real Estate SSL
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-400 truncate">
                Automated TLS &amp; Google Sheets Campaign Monitor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* IST schedule clock */}
            <button
              type="button"
              onClick={onOpenSchedulerModal}
              className="hidden lg:flex items-center gap-2.5 whitespace-nowrap bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 px-3 py-1.5 rounded-xl transition-all group text-left"
              title="Click to view automated IST schedule details"
            >
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <div className="leading-tight">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>{istTime || 'Loading IST...'}</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-[11px] text-slate-400 group-hover:text-emerald-300 transition-colors">
                  Next: <span className="font-medium text-slate-300">{nextSlotLabel}</span>{' '}
                  <span className="text-slate-500 font-mono">({formatCountdown(nextSlotSeconds)})</span>
                </div>
              </div>
            </button>

            <button type="button" onClick={onOpenSchedulerModal} className={`${iconBtn} lg:hidden`} title="IST schedule">
              <Clock className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              id="btn-google-sheet-sync"
              type="button"
              onClick={onOpenSyncModal}
              className={iconBtn}
              title={`Excel & Google Sheet Sync (${sheetConfig?.syncStatus === 'synced' ? 'synced' : 'needs sync'})`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-slate-800 ${
                  sheetConfig?.syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </button>

            {onOpenEmailModal && (
              <button id="btn-email-alerts" type="button" onClick={onOpenEmailModal} className={iconBtn} title="Email SSL Expiration Alerts">
                <Mail className="w-4 h-4 text-amber-400" />
              </button>
            )}

            <button
              id="btn-notifications"
              type="button"
              onClick={onOpenNotificationDrawer}
              className={iconBtn}
              title="View SSL Alerts & Critical Items"
            >
              <Bell className="w-4 h-4" />
              {attentionCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-rose-500 text-white ring-2 ring-slate-900">
                  {attentionCount}
                </span>
              )}
            </button>

            <button
              id="btn-toggle-theme"
              type="button"
              onClick={toggleTheme}
              className={iconBtn}
              title={isDark ? 'Dark theme active (Click to switch)' : 'Light theme active (Click to switch)'}
            >
              {isDark ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: page navigation + primary actions */}
      <div className="border-t border-slate-800/80">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-12">
            <nav className="flex items-center gap-1 h-full" aria-label="Dashboard pages">
              {tabs.map((tab) => {
                const active = activePage === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onNavigate(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-2 h-full px-2 sm:px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                      active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`hidden sm:inline px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                          active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                    <span
                      className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors ${
                        active ? 'bg-emerald-400' : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              {onFilterExpiring4Days && (
                <button
                  id="btn-header-expiring-4d"
                  type="button"
                  onClick={onFilterExpiring4Days}
                  className={`flex items-center gap-1.5 h-8 text-xs font-semibold px-2.5 rounded-lg border whitespace-nowrap transition-all ${
                    isExpiring4DaysFiltered
                      ? 'bg-rose-600 border-rose-500 text-white ring-2 ring-rose-400/50'
                      : 'bg-rose-950/70 hover:bg-rose-900 border-rose-800 text-rose-200 hover:text-white'
                  }`}
                  title="Filter table to sites expiring in next 4 days (Routine Email Alert sites)"
                >
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden md:inline">Expiring ≤ 4d</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                      isExpiring4DaysFiltered ? 'bg-white text-rose-700' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {expiringIn4DaysCount}
                  </span>
                </button>
              )}

              <button
                id="btn-batch-ssl-check"
                type="button"
                onClick={onTriggerBatchCheck}
                disabled={isCheckingNow}
                className={`flex items-center gap-1.5 h-8 text-xs font-semibold px-2.5 sm:px-3 rounded-lg border whitespace-nowrap transition-all ${
                  isCheckingNow
                    ? 'bg-emerald-900/60 border-emerald-700/50 text-emerald-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                }`}
                title="Syncs latest sheet list, checks SSL of all sites (except Suspended & Expired), and emails sites expiring in 4 days"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNow ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isCheckingNow ? 'Routine Running...' : 'Routine SSL Check'}</span>
              </button>

              <button
                id="btn-add-new-project"
                type="button"
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 h-8 text-xs font-semibold px-2.5 sm:px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white whitespace-nowrap transition-all active:scale-95"
                title="Add New Project"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Add Project</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
