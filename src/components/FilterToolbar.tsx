import React from 'react';
import {
  Search,
  Filter,
  X,
  Download,
  Upload,
  AlertOctagon,
  Radio,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { FilterOptions, CampaignStatus, ReraQrStatus } from '../types';

interface FilterToolbarProps {
  filters: FilterOptions;
  onFilterChange: (updates: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  regions: string[];
  totalFilteredCount: number;
  totalAllCount: number;
  onExportCsv: () => void;
  onExportExcel?: () => void;
  onOpenImportModal: () => void;
  expiringIn4DaysCount?: number;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  regions,
  totalFilteredCount,
  totalAllCount,
  onExportCsv,
  onExportExcel,
  onOpenImportModal,
  expiringIn4DaysCount = 0,
}) => {
  const isFiltered =
    filters.search !== '' ||
    filters.campaignStatus !== 'ALL' ||
    filters.reraQrStatus !== 'ALL' ||
    filters.region !== 'ALL' ||
    filters.server !== 'ALL' ||
    filters.sslStatus !== 'ALL' ||
    filters.daysRemainingFilter !== 'all';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4 shadow-sm space-y-3">
      {/* Top row: Quick Tabs & Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        {/* Quick Filter Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <button
            id="tab-filter-all"
            onClick={() =>
              onFilterChange({
                campaignStatus: 'ALL',
                sslStatus: 'ALL',
                reraQrStatus: 'ALL',
                daysRemainingFilter: 'all',
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filters.campaignStatus === 'ALL' &&
              filters.sslStatus === 'ALL' &&
              filters.reraQrStatus === 'ALL' &&
              filters.daysRemainingFilter === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Projects ({totalAllCount})
          </button>

          <button
            id="tab-filter-active"
            onClick={() =>
              onFilterChange({
                campaignStatus: 'Active',
                sslStatus: 'ALL',
                reraQrStatus: 'ALL',
              })
            }
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filters.campaignStatus === 'Active' && filters.sslStatus === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Campaigns</span>
          </button>

          <button
            id="tab-filter-attention"
            onClick={() =>
              onFilterChange({
                sslStatus: 'attention',
              })
            }
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filters.sslStatus === 'attention'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>⚠️ Attention Required</span>
          </button>

          <button
            id="tab-filter-expiring"
            onClick={() =>
              onFilterChange({
                sslStatus: 'expiring_soon',
              })
            }
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filters.sslStatus === 'expiring_soon'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring &lt; 15d</span>
          </button>

          <button
            id="tab-filter-expiring-4d"
            onClick={() => {
              const willBeActive = filters.daysRemainingFilter !== '4';
              onFilterChange({
                daysRemainingFilter: willBeActive ? '4' : 'all',
                sslStatus: 'ALL',
                ...(willBeActive && (filters.campaignStatus === 'Suspended' || filters.campaignStatus === 'Expired')
                  ? { campaignStatus: 'ALL' }
                  : {}),
              });
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filters.daysRemainingFilter === '4'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50'
            }`}
            title="Filter sites expiring within next 4 days (Email alert list for ashwini.poojary@homesfy.in)"
          >
            <Clock className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>🚨 Expiring ≤ 4 Days</span>
            {expiringIn4DaysCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filters.daysRemainingFilter === '4'
                    ? 'bg-white text-rose-700'
                    : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                }`}
              >
                {expiringIn4DaysCount}
              </span>
            )}
          </button>

          <button
            id="tab-filter-rera"
            onClick={() =>
              onFilterChange({
                reraQrStatus: 'Not Working',
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filters.reraQrStatus === 'Not Working'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60'
            }`}
          >
            QR Not Working
          </button>
        </div>

        {/* Export / Import tools */}
        <div className="flex items-center space-x-2">
          {onExportExcel && (
            <button
              id="btn-export-excel"
              onClick={onExportExcel}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
              title="Download latest updated Excel spreadsheet (.xlsx) with all campaigns, statuses & SSL data"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel (.xlsx)</span>
            </button>
          )}

          <button
            id="btn-export-csv"
            onClick={onExportCsv}
            className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Download full dataset with SSL metrics as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-import-csv"
            onClick={onOpenImportModal}
            className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Import or update rows from CSV"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* Main Filter Bar Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Search Input */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-projects"
            type="text"
            placeholder="Search domain, region, comment, server..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Campaign Status Dropdown */}
        <div>
          <select
            id="select-filter-campaign-status"
            value={filters.campaignStatus}
            onChange={(e) =>
              onFilterChange({ campaignStatus: e.target.value as CampaignStatus | 'ALL' })
            }
            className="w-full py-2 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Campaign: All</option>
            <option value="Active">Campaign: Active</option>
            <option value="Paused">Campaign: Paused</option>
            <option value="Suspended">Campaign: Suspended</option>
            <option value="Not Started">Campaign: Not Started</option>
            <option value="Expired">Campaign: Expired</option>
          </select>
        </div>

        {/* SSL Status Dropdown */}
        <div>
          <select
            id="select-filter-ssl-status"
            value={filters.sslStatus}
            onChange={(e) => onFilterChange({ sslStatus: e.target.value as any })}
            className="w-full py-2 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">SSL Status: All</option>
            <option value="valid">SSL: Healthy / Valid</option>
            <option value="expiring_soon">SSL: Expiring Soon (&lt; 15d)</option>
            <option value="expired">SSL: Expired</option>
            <option value="invalid">SSL: Invalid / Failed</option>
            <option value="attention">SSL: Attention Required</option>
            <option value="untested">SSL: Untested</option>
          </select>
        </div>

        {/* RERA QR Status Dropdown */}
        <div>
          <select
            id="select-filter-rera-status"
            value={filters.reraQrStatus}
            onChange={(e) => onFilterChange({ reraQrStatus: e.target.value })}
            className="w-full py-2 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">RERA QR: All</option>
            <option value="Working">RERA: Working</option>
            <option value="Not Working">RERA: Not Working</option>
            <option value="No QR">RERA: No QR</option>
            <option value="No RERA">RERA: No RERA</option>
            <option value="Pending">RERA: Pending</option>
          </select>
        </div>

        {/* Region Dropdown */}
        <div>
          <select
            id="select-filter-region"
            value={filters.region}
            onChange={(e) => onFilterChange({ region: e.target.value })}
            className="w-full py-2 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Region: All</option>
            {regions.map((reg) => (
              <option key={reg} value={reg}>
                Region: {reg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter status row with count & reset button */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{totalFilteredCount}</strong> of{' '}
            {totalAllCount} projects
          </span>
          {isFiltered && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
              Filters Active
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            id="btn-reset-filters"
            onClick={onResetFilters}
            className="flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
