import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
} from 'lucide-react';
import {
  ProjectRecord,
  CampaignStatus,
  ReraQrStatus,
  SSLHealthStatus,
} from '../types';

interface ProjectTableProps {
  projects: ProjectRecord[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: string) => void;
  onCheckSSL: (id: string) => void;
  checkingIds: string[];
  onOpenSSLDetail: (project: ProjectRecord) => void;
  onOpenEditModal: (project: ProjectRecord) => void;
  onDeleteProject: (project: ProjectRecord) => void;
  onQuickUpdateStatus: (id: string, newStatus: CampaignStatus) => void;
  onQuickUpdateRera: (id: string, newRera: ReraQrStatus) => void;
  onQuickUpdateImageOptimize?: (id: string, newOptimize: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string) => void;
  // Bulk Actions
  onBulkCheckSSL: () => void;
  onBulkUpdateCampaign: (status: CampaignStatus) => void;
  onBulkUpdateRera: (status: ReraQrStatus) => void;
  onBulkUpdateImageOptimize?: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onCheckSSL,
  checkingIds,
  onOpenSSLDetail,
  onOpenEditModal,
  onDeleteProject,
  onQuickUpdateStatus,
  onQuickUpdateRera,
  onQuickUpdateImageOptimize,
  sortField,
  sortDirection,
  onSortChange,
  onBulkCheckSSL,
  onBulkUpdateCampaign,
  onBulkUpdateRera,
  onBulkUpdateImageOptimize,
  onBulkDelete,
  onClearSelection,
  currentPage: propPage,
  onPageChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination state (controlled or uncontrolled with guaranteed reset on filter change)
  const [internalPage, setInternalPage] = useState(1);
  const rawPage = propPage ?? internalPage;
  const pageSize = 25;
  const totalPages = Math.ceil(projects.length / pageSize) || 1;
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);

  const setCurrentPage = (pageOrFn: number | ((prev: number) => number)) => {
    const next = typeof pageOrFn === 'function' ? pageOrFn(currentPage) : pageOrFn;
    if (onPageChange) {
      onPageChange(next);
    } else {
      setInternalPage(next);
    }
  };

  // Reset pagination to page 1 whenever filtered projects array changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(1);
    } else {
      setInternalPage(1);
    }
  }, [projects]);

  const paginatedProjects = projects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCampaignBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case 'Paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Paused
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            Suspended
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
            Expired
          </span>
        );
      case 'Not Started':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Not Started
          </span>
        );
    }
  };

  const getReraBadge = (status: string) => {
    const s = (status || '').trim();
    if (s === 'Working') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Working
        </span>
      );
    }
    if (s === 'Not Working') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          Not Working
        </span>
      );
    }
    if (s === 'No QR') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          No QR
        </span>
      );
    }
    if (s.toLowerCase().includes('rera')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        {s || 'Pending'}
      </span>
    );
  };

  const getSSLBadge = (ssl: ProjectRecord['ssl']) => {
    const status = ssl?.status || 'untested';
    const days = ssl?.daysRemaining;

    if (status === 'valid') {
      return (
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{days !== null ? `${days}d left` : 'Valid'}</span>
          </span>
        </div>
      );
    }

    if (status === 'expiring_soon') {
      return (
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-400 dark:border-amber-700 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{days !== null ? `${days}d left!` : 'Expiring'}</span>
          </span>
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Expired</span>
          </span>
        </div>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="flex items-center space-x-1.5">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700"
            title={ssl?.error || 'SSL Error'}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Failing / Error</span>
          </span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Untested</span>
      </span>
    );
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-1 inline" />
    );
  };

  const isAllSelected =
    projects.length > 0 && selectedIds.length === projects.length;

  return (
    <div className="space-y-3">
      {/* Floating Bulk Action Bar (when items are selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Bulk actions for selected landing pages:
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Bulk Check SSL */}
            <button
              id="btn-bulk-check-ssl"
              onClick={onBulkCheckSSL}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check SSL ({selectedIds.length})</span>
            </button>

            {/* Bulk Campaign Status */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onBulkUpdateCampaign(e.target.value as CampaignStatus);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Set Campaign Status...
              </option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Suspended">Suspended</option>
              <option value="Not Started">Not Started</option>
              <option value="Expired">Expired</option>
            </select>

            {/* Bulk RERA QR Status */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onBulkUpdateRera(e.target.value as ReraQrStatus);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Set RERA QR...
              </option>
              <option value="Working">Working</option>
              <option value="Not Working">Not Working</option>
              <option value="No QR">No QR</option>
              <option value="No RERA">No RERA</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Bulk Image Optimize */}
            {onBulkUpdateImageOptimize && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onBulkUpdateImageOptimize(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>
                  Set Image Optimize...
                </option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
              </select>
            )}

            {/* Bulk Delete */}
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={onClearSelection}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                {/* Checkbox select all */}
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    title="Select All"
                  />
                </th>

                {/* URL */}
                <th
                  onClick={() => onSortChange('url')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[280px] sm:min-w-[340px]"
                >
                  <div className="flex items-center">
                    <span>URL (Domain)</span>
                    {renderSortIcon('url')}
                  </div>
                </th>

                {/* Campaign Status */}
                <th
                  onClick={() => onSortChange('campaignStatus')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[120px]"
                >
                  <div className="flex items-center">
                    <span>Campaign Status</span>
                    {renderSortIcon('campaignStatus')}
                  </div>
                </th>

                {/* SSL Health Status */}
                <th
                  onClick={() => onSortChange('sslStatus')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[130px]"
                >
                  <div className="flex items-center">
                    <span>SSL Health</span>
                    {renderSortIcon('sslStatus')}
                  </div>
                </th>

                {/* SSL Expiry & Issuer */}
                <th
                  onClick={() => onSortChange('sslExpiry')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[160px]"
                >
                  <div className="flex items-center">
                    <span>Expiry &amp; Issuer</span>
                    {renderSortIcon('sslExpiry')}
                  </div>
                </th>

                {/* Region */}
                <th
                  onClick={() => onSortChange('region')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[100px]"
                >
                  <div className="flex items-center">
                    <span>Region</span>
                    {renderSortIcon('region')}
                  </div>
                </th>

                {/* Server */}
                <th
                  onClick={() => onSortChange('server')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[80px]"
                >
                  <div className="flex items-center">
                    <span>Server</span>
                    {renderSortIcon('server')}
                  </div>
                </th>

                {/* RERA QR Status */}
                <th
                  onClick={() => onSortChange('reraQrStatus')}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white min-w-[120px]"
                >
                  <div className="flex items-center">
                    <span>RERA QR Status</span>
                    {renderSortIcon('reraQrStatus')}
                  </div>
                </th>

                {/* Lead Link */}
                <th className="p-3 min-w-[90px]">
                  <span>Lead Link</span>
                </th>

                {/* Image Optimize */}
                <th className="p-3 min-w-[100px]">
                  <span>Image Opt.</span>
                </th>

                {/* Comment */}
                <th className="p-3 min-w-[140px]">
                  <span>Comment</span>
                </th>

                {/* Row Actions */}
                <th className="p-3 text-right sticky right-0 bg-slate-50 dark:bg-slate-800/90 min-w-[120px]">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    No matching projects found. Try adjusting your filters or search terms.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => {
                  const isSelected = selectedIds.includes(project.id);
                  const isChecking = checkingIds.includes(project.id);
                  const trimmedUrl = (project.url || '').trim();
                  const cleanDomain = trimmedUrl
                    .replace(/^https?:\/\//, '')
                    .replace(/\/$/, '');

                  // Safe URL generator that avoids browser connection crashes
                  const safeTargetUrl = (() => {
                    if (!trimmedUrl) return '#';
                    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                      return trimmedUrl;
                    }
                    if (project.ssl?.error?.includes('port 443')) {
                      return `http://${trimmedUrl}`;
                    }
                    return `https://${trimmedUrl}`;
                  })();

                  return (
                    <tr
                      key={project.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-emerald-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectRow(project.id)}
                          className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>

                      {/* URL */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2 group">
                          <a
                            href={safeTargetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-emerald-600 dark:text-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-200 hover:underline font-mono text-xs sm:text-[13px] tracking-tight leading-snug break-all max-w-[260px] sm:max-w-[340px] inline-block transition-colors"
                            title={`Open ${safeTargetUrl} in new tab (Click to visit)`}
                          >
                            {cleanDomain}
                          </a>
                          <a
                            href={safeTargetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600/70 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors shrink-0"
                            title={`Open ${safeTargetUrl} in new tab`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => copyToClipboard(trimmedUrl, project.id)}
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                            title="Copy full URL"
                          >
                            {copiedId === project.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Campaign Status (Interactive Dropdown) */}
                      <td className="p-3">
                        <div className="relative group/status">
                          {getCampaignBadge(project.campaignStatus)}
                          <select
                            value={project.campaignStatus}
                            onChange={(e) =>
                              onQuickUpdateStatus(
                                project.id,
                                e.target.value as CampaignStatus
                              )
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title="Click to quickly change Campaign Status"
                          >
                            <option value="Active">Active</option>
                            <option value="Paused">Paused</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Not Started">Not Started</option>
                            <option value="Expired">Expired</option>
                          </select>
                        </div>
                      </td>

                      {/* SSL Health Status (Clickable for full TLS details) */}
                      <td className="p-3">
                        <div
                          onClick={() => onOpenSSLDetail(project)}
                          className="cursor-pointer inline-block"
                          title="Click to inspect SSL certificate details & check history"
                        >
                          {getSSLBadge(project.ssl)}
                        </div>
                      </td>

                      {/* SSL Expiry & Issuer */}
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        <div className="leading-tight">
                          <div className="font-mono text-[11px]">
                            {project.ssl?.validTo ? (
                              new Date(project.ssl.validTo).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            ) : (
                              <span className="text-slate-400">Not verified</span>
                            )}
                          </div>
                          <div
                            className="text-[10px] text-slate-400 truncate max-w-[150px]"
                            title={project.ssl?.issuer || 'Unknown Authority'}
                          >
                            {project.ssl?.issuer || '—'}
                          </div>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {project.region || '—'}
                        </span>
                      </td>

                      {/* Server */}
                      <td className="p-3">
                        <span
                          className={`uppercase text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            project.server.toLowerCase() === 'aws'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {project.server || 'nginx'}
                        </span>
                      </td>

                      {/* RERA QR Status */}
                      <td className="p-3">
                        <div className="relative group/rera">
                          {getReraBadge(project.reraQrStatus)}
                          <select
                            value={project.reraQrStatus}
                            onChange={(e) =>
                              onQuickUpdateRera(
                                project.id,
                                e.target.value as ReraQrStatus
                              )
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title="Click to quickly change RERA QR Status"
                          >
                            <option value="Working">Working</option>
                            <option value="Not Working">Not Working</option>
                            <option value="No QR">No QR</option>
                            <option value="No RERA">No RERA</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                      </td>

                      {/* Lead Link */}
                      <td className="p-3">
                        {project.leadLink ? (
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 inline-block">
                            {project.leadLink}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Image Optimize */}
                      <td className="p-3">
                        <div className="relative group/imgopt inline-block">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                              project.imageOptimize === 'Done'
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {project.imageOptimize || 'Pending'}
                          </span>
                          {onQuickUpdateImageOptimize && (
                            <select
                              value={project.imageOptimize || 'Pending'}
                              onChange={(e) =>
                                onQuickUpdateImageOptimize(project.id, e.target.value)
                              }
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              title="Click to quickly change Image Optimize status"
                            >
                              <option value="Done">Done</option>
                              <option value="Pending">Pending</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Comment */}
                      <td className="p-3">
                        <span
                          className="text-[11px] text-slate-600 dark:text-slate-400 truncate block max-w-[130px]"
                          title={project.comment}
                        >
                          {project.comment || '—'}
                        </span>
                      </td>

                      {/* Row Action Buttons */}
                      <td className="p-3 text-right sticky right-0 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="flex items-center justify-end space-x-1">
                          {/* SSL Live Check Button */}
                          <button
                            onClick={() => onCheckSSL(project.id)}
                            disabled={isChecking}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Run Real-Time SSL Check"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-500' : ''}`}
                            />
                          </button>

                          {/* Inspect SSL Details */}
                          <button
                            onClick={() => onOpenSSLDetail(project)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View SSL Certificate & Check History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Project */}
                          <button
                            onClick={() => onOpenEditModal(project)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Edit Project Fields"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Project */}
                          <button
                            onClick={() => onDeleteProject(project)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, projects.length)} of {projects.length} entries
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <span className="px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
