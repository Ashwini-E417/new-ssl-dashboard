import React from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ProjectRecord } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectRecord[];
  onSelectProject: (project: ProjectRecord) => void;
  onRecheckCritical: () => void;
  isRechecking: boolean;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onRecheckCritical,
  isRechecking,
}) => {
  if (!isOpen) return null;

  // Collect all critical items strictly for SSL: expired, invalid, expiring_soon (<15d)
  const criticalItems = projects.filter((p) => {
    const status = p.ssl?.status;
    return status === 'expired' || status === 'invalid' || status === 'expiring_soon';
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                SSL &amp; Campaign Alerts
              </h2>
              <p className="text-[11px] text-slate-500">
                {criticalItems.length} active issue(s) detected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Requires immediate renewal or fix
          </span>
          <button
            onClick={onRecheckCritical}
            disabled={isRechecking || criticalItems.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRechecking ? 'animate-spin' : ''}`} />
            <span>Recheck Critical</span>
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {criticalItems.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No Critical Alerts
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                All monitored certificates are valid and healthy!
              </p>
            </div>
          ) : (
            criticalItems.map((project) => {
              const status = project.ssl?.status;
              const days = project.ssl?.daysRemaining;
              const isExpired = status === 'expired';
              const isInvalid = status === 'invalid';
              const isExpiring = status === 'expiring_soon';

              return (
                <div
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2.5">
                      <div
                        className={`p-1.5 rounded-md mt-0.5 ${
                          isExpired || isInvalid
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                        }`}
                      >
                        {isExpired || isInvalid ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors block">
                          {project.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{project.region}</span>
                          <span>•</span>
                          <span
                            className={`font-semibold ${
                              project.campaignStatus === 'Active'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {project.campaignStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                  </div>

                  {/* Specific alert description badge */}
                  <div className="mt-2 text-[11px]">
                    {isExpired && (
                      <span className="inline-block px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-semibold">
                        Expired {Math.abs(days || 0)} days ago
                      </span>
                    )}
                    {isInvalid && (
                      <span className="inline-block px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-semibold">
                        {project.ssl?.error || 'Certificate handshake failed'}
                      </span>
                    )}
                    {isExpiring && (
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold">
                        Expiring in {days} days
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
