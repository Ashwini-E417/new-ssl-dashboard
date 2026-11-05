import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertCircle, Globe } from 'lucide-react';
import { ProjectRecord, CampaignStatus, ReraQrStatus, ServerType } from '../types';

interface EditProjectModalProps {
  isOpen: boolean;
  project: ProjectRecord | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ProjectRecord>, checkSslNow: boolean) => Promise<void>;
  existingRegions: string[];
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
  existingRegions,
}) => {
  const [url, setUrl] = useState('');
  const [leadLink, setLeadLink] = useState('');
  const [server, setServer] = useState<ServerType>('nginx');
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('Active');
  const [region, setRegion] = useState('');
  const [imageOptimize, setImageOptimize] = useState('Pending');
  const [reraQrStatus, setReraQrStatus] = useState<ReraQrStatus>('Pending');
  const [comment, setComment] = useState('');
  const [checkSslNow, setCheckSslNow] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setUrl(project.url || '');
      setLeadLink(project.leadLink || '');
      setServer((project.server as ServerType) || 'nginx');
      setCampaignStatus(project.campaignStatus || 'Active');
      setRegion(project.region || '');
      setImageOptimize(project.imageOptimize || 'Pending');
      setReraQrStatus(project.reraQrStatus || 'Pending');
      setComment(project.comment || '');
      setCheckSslNow(false);
      setError(null);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('URL cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        project.id,
        {
          url: url.trim(),
          leadLink: leadLink.trim(),
          server,
          campaignStatus,
          region: region.trim(),
          imageOptimize,
          reraQrStatus,
          comment: comment.trim(),
        },
        checkSslNow
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Edit Campaign Record
            </h2>
            <p className="text-xs text-slate-500 truncate max-w-sm font-mono">
              {project.url}
            </p>
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
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
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
                <option value="Active">Active</option>
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
                list="edit-region-options"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="edit-region-options">
                {existingRegions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            {/* Server */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Server
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
                Lead Link
              </label>
              <input
                type="text"
                value={leadLink}
                onChange={(e) => setLeadLink(e.target.value)}
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
              Comment
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Re-check SSL option */}
          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <input
                type="checkbox"
                checked={checkSslNow}
                onChange={(e) => setCheckSslNow(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Trigger real-time TLS handshake check on save
              </span>
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
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save & Sync'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
