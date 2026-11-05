import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
  Lock,
  Server,
  Activity,
  CheckCircle2,
  ExternalLink,
  History,
  FileText,
} from 'lucide-react';
import { ProjectRecord, SSLCheckResult } from '../types';

interface SSLDetailModalProps {
  isOpen: boolean;
  project: ProjectRecord | null;
  onClose: () => void;
  onRecheckSSL: (id: string) => Promise<void>;
  isChecking: boolean;
}

export const SSLDetailModal: React.FC<SSLDetailModalProps> = ({
  isOpen,
  project,
  onClose,
  onRecheckSSL,
  isChecking,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  if (!isOpen || !project) return null;

  const ssl: SSLCheckResult | undefined = project.ssl;
  const status = ssl?.status || 'untested';
  const days = ssl?.daysRemaining;

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getDaysProgressPercent = () => {
    if (days === null || days === undefined) return 0;
    if (days <= 0) return 0;
    // Standard 90-day validity window
    return Math.min(100, Math.max(5, Math.round((days / 90) * 100)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-start space-x-3">
            <div
              className={`p-2.5 rounded-xl ${
                status === 'valid'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                  : status === 'expiring_soon'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
              }`}
            >
              {status === 'valid' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : status === 'expiring_soon' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {project.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </h2>
                <a
                  href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Region: {project.region}</span>
                <span>•</span>
                <span>Server: {project.server}</span>
                <span>•</span>
                <span>Campaign: {project.campaignStatus}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onRecheckSSL(project.id)}
              disabled={isChecking}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
              title="Perform immediate live TLS check"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check SSL Now'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center space-x-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Certificate Details</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Check History ({project.history?.length || 0})</span>
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-4">
            {/* Health Overview Box */}
            <div
              className={`p-4 rounded-xl border ${
                status === 'valid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : status === 'expiring_soon'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Status &amp; Lifespan
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    status === 'valid'
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : status === 'expiring_soon'
                      ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  {status.replace('_', ' ')}
                </span>
              </div>

              {/* Countdown / Days remaining bar */}
              {days !== null && days !== undefined && (
                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {days > 0 ? `${days} Days Remaining` : `Expired ${Math.abs(days)} Days Ago`}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Expires: {formatDate(ssl?.validTo)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        days > 30
                          ? 'bg-emerald-500'
                          : days > 14
                          ? 'bg-teal-500'
                          : days > 0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${getDaysProgressPercent()}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error warning if failing */}
              {ssl?.error && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 text-xs text-rose-900 dark:text-rose-200 font-mono">
                  <strong>Diagnostic Error:</strong> {ssl.error}
                </div>
              )}
            </div>

            {/* Certificate Metadata Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                  Issuer Authority
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ssl?.issuer || 'Unknown'}
                </span>
                {ssl?.issuerOrg && (
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Organization: {ssl.issuerOrg}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                  Valid Timeframe
                </span>
                <span className="text-slate-700 dark:text-slate-300 block text-[11px]">
                  From: {formatDate(ssl?.validFrom)}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] mt-0.5">
                  To: {formatDate(ssl?.validTo)}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                  Handshake Protocol &amp; Cipher
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200 block text-[11px]">
                  {ssl?.protocol || 'TLSv1.3'}
                </span>
                <span className="font-mono text-slate-500 block text-[10px] truncate mt-0.5" title={ssl?.cipher || ''}>
                  {ssl?.cipher || 'TLS_AES_256_GCM_SHA384'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                  Response Latency &amp; Last Check
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ssl?.responseTimeMs ? `${ssl.responseTimeMs} ms` : '—'}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Checked: {formatDate(ssl?.lastCheckedAt)}
                </span>
              </div>
            </div>

            {/* Subject Alternative Names (SANs) */}
            {ssl?.san && ssl.san.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1.5">
                  Subject Alternative Names (SANs)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ssl.san.map((sanItem, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                    >
                      {sanItem}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Check History Timeline */
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {(!project.history || project.history.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No past check history logged yet for this domain.
              </p>
            ) : (
              project.history.map((h, i) => (
                <div
                  key={h.id || i}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        h.status === 'valid'
                          ? 'bg-emerald-500'
                          : h.status === 'expiring_soon'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {h.status === 'valid'
                          ? `Valid (${h.daysRemaining} days left)`
                          : h.status === 'expiring_soon'
                          ? `Expiring Soon (${h.daysRemaining} days)`
                          : `Failed / Expired (${h.error || 'SSL Error'})`}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Triggered: <span className="font-medium text-slate-500">{h.triggeredBy || 'system'}</span> • Latency:{' '}
                        {h.responseTimeMs}ms
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    {formatDate(h.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
