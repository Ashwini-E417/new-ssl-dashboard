import React, { useState } from 'react';
import { X, Plus, ShieldCheck, Globe, AlertCircle } from 'lucide-react';
import { CampaignStatus, ReraQrStatus, ServerType } from '../types';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (data: {
    url: string;
    leadLink: string;
    server: ServerType;
    campaignStatus: CampaignStatus;
    region: string;
    imageOptimize: string;
    reraQrStatus: ReraQrStatus;
    comment: string;
    checkSslNow: boolean;
  }) => Promise<void>;
  existingRegions: string[];
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  existingRegions,
}) => {
  const [url, setUrl] = useState('');
  const [leadLink, setLeadLink] = useState('');
  const [server, setServer] = useState<ServerType>('nginx');
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('Active');
  const [region, setRegion] = useState('Pune');
  const [imageOptimize, setImageOptimize] = useState('Pending');
  const [reraQrStatus, setReraQrStatus] = useState<ReraQrStatus>('Pending');
  const [comment, setComment] = useState('');
  const [checkSslNow, setCheckSslNow] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateUrl = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    // Allow domain format with or without https://
    const domainRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    return domainRegex.test(trimmed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateUrl(url)) {
      setError('Please enter a valid landing page URL or domain name (e.g. project-domain.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddProject({
        url: url.trim(),
        leadLink: leadLink.trim(),
        server,
        campaignStatus,
        region: region.trim(),
        imageOptimize,
        reraQrStatus,
        comment: comment.trim(),
        checkSslNow,
      });

      // Reset and close
      setUrl('');
      setLeadLink('');
      setComment('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Real Estate Campaign
              </h2>
              <p className="text-xs text-slate-500">
                Preserves all Google Sheet columns and initiates real-time SSL checking.
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

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Landing Page URL / Domain <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="https://example-residences.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Supports full URL or root domain. SSL handshake is tested directly on port 443.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Campaign Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campaign Status
              </label>
              <select
                value={campaignStatus}
                onChange={(e) => setCampaignStatus(e.target.value as CampaignStatus)}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Active">Active (Auto-monitored 3x daily IST)</option>
                <option value="Paused">Paused</option>
                <option value="Suspended">Suspended</option>
                <option value="Not Started">Not Started</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* RERA QR Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                RERA QR Status
              </label>
              <select
                value={reraQrStatus}
                onChange={(e) => setReraQrStatus(e.target.value as ReraQrStatus)}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Working">Working</option>
                <option value="Not Working">Not Working</option>
                <option value="No QR">No QR</option>
                <option value="No RERA">No RERA</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Region
              </label>
              <input
                type="text"
                list="region-options"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Pune, Thane, Central, Sobo"
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="region-options">
                {existingRegions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            {/* Server */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Server Environment
              </label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value as ServerType)}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="nginx">nginx</option>
                <option value="aws">aws</option>
              </select>
            </div>

            {/* Lead Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lead Link Identifier
              </label>
              <input
                type="text"
                value={leadLink}
                onChange={(e) => setLeadLink(e.target.value)}
                placeholder="e.g. LL_01, GSheet"
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Image Optimize */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Image Optimize
              </label>
              <select
                value={imageOptimize}
                onChange={(e) => setImageOptimize(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Comments / Notes
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. SSL renewing soon, RERA cert approved, Campaign target Q3"
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Real-time SSL Check option */}
          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <input
                type="checkbox"
                checked={checkSslNow}
                onChange={(e) => setCheckSslNow(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Perform TLS handshake &amp; SSL inspection immediately
                </span>
                <span className="text-slate-500 block text-[11px]">
                  Queries the server directly and returns cert expiry, issuer, and validation status.
                </span>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding & Checking SSL...' : 'Add Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
