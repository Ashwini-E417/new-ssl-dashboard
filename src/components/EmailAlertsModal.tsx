import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Settings,
  RefreshCw,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { EmailAlertLog, EmailSettings } from '../types';

interface ExpiringSite {
  id?: string;
  url: string;
  validTo: string | null;
  daysRemaining: number | null;
  campaignStatus: string;
  region?: string;
  issuer?: string;
}

interface EmailAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  onFilterInTable?: () => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onFilterInTable,
}) => {
  const [activeTab, setActiveTab] = useState<'expiring' | 'logs' | 'settings'>('expiring');
  const [expiringSites, setExpiringSites] = useState<ExpiringSite[]>([]);
  const [recipient, setRecipient] = useState<string>('ashwini.poojary@homesfy.in');
  const [logs, setLogs] = useState<EmailAlertLog[]>([]);
  const [settings, setSettings] = useState<EmailSettings>({
    recipientEmail: 'ashwini.poojary@homesfy.in',
    alertThresholdDays: 4,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    senderEmail: 'certpulse-alerts@sslmonitor.app',
    enabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewLog, setPreviewLog] = useState<EmailAlertLog | null>(null);

  const fetchAlertData = async () => {
    setIsLoading(true);
    try {
      const [expiringRes, logsRes, settingsRes] = await Promise.all([
        fetch('/api/ssl/expiring-4days'),
        fetch('/api/email/logs'),
        fetch('/api/email/settings'),
      ]);

      if (expiringRes.ok) {
        const data = await expiringRes.json();
        setExpiringSites(data.sites || []);
        if (data.recipient) setRecipient(data.recipient);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData || []);
      }
      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setSettings(setts);
        if (setts.recipientEmail) setRecipient(setts.recipientEmail);
      }
    } catch (e) {
      console.error('Error fetching email alerts data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlertData();
      setSendResult(null);
    }
  }, [isOpen]);

  const handleSendAlertNow = async (forceDemo = false) => {
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/email/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipient,
          forceSendAllExpiring: forceDemo,
        }),
      });
      const data = await res.json();
      setSendResult({
        success: data.success,
        message: data.message || 'Alert dispatched.',
      });
      await fetchAlertData();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      setSendResult({
        success: false,
        message: e.message || 'Failed to dispatch email alert.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSendResult({ success: true, message: 'Email settings saved successfully!' });
      }
    } catch (e: any) {
      setSendResult({ success: false, message: e.message || 'Failed to save settings' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Email SSL Expiration Alerts (Next 4 Days)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Automated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Recipient: <strong className="text-slate-800 dark:text-slate-200">{recipient}</strong>
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

        {/* Tab Buttons */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('expiring')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'expiring'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Expiring Sites ({expiringSites.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Alert History ({logs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>SMTP &amp; Settings</span>
            </button>
          </div>

          <button
            onClick={fetchAlertData}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Feedback message */}
        {sendResult && (
          <div
            className={`p-3 rounded-xl mb-3 text-xs flex items-center justify-between border ${
              sendResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <span>{sendResult.message}</span>
            <button onClick={() => setSendResult(null)} className="opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body content based on activeTab */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'expiring' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                <strong>Routine Alert Policy:</strong> Every routine SSL check automatically tests all sites (excluding <code>Suspended</code> and <code>Expired</code>). If any certificate expires in <strong>4 days or less</strong>, an automated alert email is sent to <strong>{recipient}</strong>.
              </div>

              {expiringSites.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-slate-200">
                    No Certificates Expiring in the Next 4 Days
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    All non-suspended active campaigns have certificates valid for &gt; 4 days.
                  </p>
                  <button
                    onClick={() => handleSendAlertNow(true)}
                    disabled={isSending}
                    className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send Test Email to {recipient}</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-200">
                      Found {expiringSites.length} domain{expiringSites.length === 1 ? '' : 's'} expiring within 4 days:
                    </span>
                    <div className="flex items-center gap-2">
                      {onFilterInTable && (
                        <button
                          onClick={() => {
                            onClose();
                            onFilterInTable();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1 transition-all"
                          title="Close modal and filter this list in the main dashboard table"
                        >
                          <span>Filter in Table</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleSendAlertNow(false)}
                        disabled={isSending}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSending ? 'Sending Alert...' : 'Send Alert Email Now'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Domain / URL</th>
                          <th className="py-2.5 px-3">Expiration Date</th>
                          <th className="py-2.5 px-3">Urgency</th>
                          <th className="py-2.5 px-3">Campaign</th>
                          <th className="py-2.5 px-3">Issuer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {expiringSites.map((site, idx) => {
                          const days = site.daysRemaining ?? 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-100">
                                <a
                                  href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:underline inline-flex items-center gap-1"
                                >
                                  {site.url}
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                </a>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-200">
                                {site.validTo
                                  ? new Date(site.validTo).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Unknown'}
                              </td>
                              <td className="py-2.5 px-3">
                                {days <= 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px] border border-rose-500/30">
                                    Expired ({days}d)
                                  </span>
                                ) : days === 1 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] border border-amber-500/30">
                                    1 Day Left (Urgent)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold text-[10px] border border-amber-500/20">
                                    {days} Days Remaining
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-300">
                                  {site.campaignStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                                {site.issuer || 'Unknown'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs">
                  No email alerts logged yet. Routine checks and manual tests will appear here.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{log.subject}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}
                        >
                          {log.status === 'simulated' ? 'Generated & Logged' : log.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Dispatched to <strong>{log.recipient}</strong> •{' '}
                        {new Date(log.sentAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {log.sites && log.sites.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {log.sites.slice(0, 4).map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 font-mono text-[10px] text-slate-300"
                            >
                              {s.url} ({s.daysRemaining}d)
                            </span>
                          ))}
                          {log.sites.length > 4 && (
                            <span className="text-[10px] text-slate-500 self-center">
                              +{log.sites.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {log.htmlPreview && (
                      <button
                        onClick={() => setPreviewLog(log)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[11px] whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Preview HTML</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Alert Recipient Email *
                  </label>
                  <input
                    type="email"
                    value={settings.recipientEmail}
                    onChange={(e) => setSettings({ ...settings, recipientEmail: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                    placeholder="ashwini.poojary@homesfy.in"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Default destination for routine SSL expiration emails.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Expiration Threshold (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.alertThresholdDays}
                    onChange={(e) =>
                      setSettings({ ...settings, alertThresholdDays: parseInt(e.target.value, 10) || 4 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Trigger alert if SSL expires in ≤ this number of days (default: 4 days).
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="font-bold text-slate-200 mb-1">SMTP Transport Credentials (Optional)</h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  If SMTP is configured, emails are dispatched live via nodemailer. If empty, emails are generated, previewed, and logged in dashboard history.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      SMTP Host (e.g., smtp.gmail.com)
                    </label>
                    <input
                      type="text"
                      value={settings.smtpHost || ''}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      SMTP Port (default: 587)
                    </label>
                    <input
                      type="number"
                      value={settings.smtpPort || 587}
                      onChange={(e) =>
                        setSettings({ ...settings, smtpPort: parseInt(e.target.value, 10) || 587 })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      SMTP User / Gmail Address
                    </label>
                    <input
                      type="text"
                      value={settings.smtpUser || ''}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      placeholder="alerts@domain.com or Gmail"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      SMTP Password / Gmail App Password
                    </label>
                    <input
                      type="password"
                      value={settings.smtpPass || ''}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}
        </div>

        {/* HTML Preview Drawer / Modal */}
        {previewLog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="font-bold text-sm text-slate-200">Email HTML Preview</span>
                <button
                  onClick={() => setPreviewLog(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800">
                <iframe
                  title="HTML Preview"
                  srcDoc={previewLog.htmlPreview}
                  className="w-full h-[400px] rounded border-0 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Routine check runs at 10:30, 2:30 &amp; 6:00 IST and sends alerts for ≤ 4 days.
          </span>
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
