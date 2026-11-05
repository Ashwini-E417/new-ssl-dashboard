import React from 'react';
import { MapPin, PieChart, Layers, CheckCircle, AlertOctagon } from 'lucide-react';
import { ProjectRecord, CampaignStatus } from '../types';

interface RegionalSummaryProps {
  projects: ProjectRecord[];
  activeRegionFilter: string;
  activeCampaignFilter: string;
  onSelectRegion: (region: string) => void;
  onSelectCampaign: (status: CampaignStatus | 'ALL') => void;
}

export const RegionalSummary: React.FC<RegionalSummaryProps> = ({
  projects,
  activeRegionFilter,
  activeCampaignFilter,
  onSelectRegion,
  onSelectCampaign,
}) => {
  // Aggregate by Region
  const regionMap = new Map<string, { total: number; valid: number; attention: number }>();
  // Aggregate by Campaign
  const campaignMap: Record<CampaignStatus, number> = {
    Active: 0,
    Paused: 0,
    Suspended: 0,
    'Not Started': 0,
    Expired: 0,
  };

  projects.forEach((p) => {
    const reg = (p.region || 'General').trim();
    const curr = regionMap.get(reg) || { total: 0, valid: 0, attention: 0 };
    curr.total++;

    const status = p.ssl?.status;
    if (status === 'valid') {
      curr.valid++;
    } else if (status === 'expired' || status === 'invalid' || status === 'expiring_soon') {
      curr.attention++;
    }
    regionMap.set(reg, curr);

    if (p.campaignStatus && campaignMap[p.campaignStatus] !== undefined) {
      campaignMap[p.campaignStatus]++;
    }
  });

  const sortedRegions = Array.from(regionMap.entries()).sort(
    (a, b) => b[1].total - a[1].total
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4 shadow-sm">
      <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-6">
        {/* Left: Campaign Status Summary Pills */}
        <div className="w-full xl:w-auto xl:shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Campaign Distribution
          </span>
          <div className="flex flex-wrap gap-2 xl:flex-nowrap">
            {(['Active', 'Paused', 'Suspended', 'Not Started', 'Expired'] as CampaignStatus[]).map((status) => {
              const count = campaignMap[status] || 0;
              const isSelected = activeCampaignFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => onSelectCampaign(isSelected ? 'ALL' : status)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'Active'
                        ? 'bg-emerald-500'
                        : status === 'Paused'
                        ? 'bg-amber-500'
                        : status === 'Suspended'
                        ? 'bg-rose-500'
                        : status === 'Expired'
                        ? 'bg-red-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{status}</span>
                  <span className="font-mono text-[11px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hidden xl:block xl:ml-auto self-stretch w-px bg-slate-200 dark:bg-slate-800" />

        {/* Right: Region filter dropdown */}
        <div className="w-full xl:w-80 xl:shrink-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label
              htmlFor="region-summary-select"
              className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            >
              Regional SSL Coverage
            </label>
            {activeRegionFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectRegion('ALL')}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              id="region-summary-select"
              value={activeRegionFilter}
              onChange={(e) => onSelectRegion(e.target.value)}
              className={`w-full pl-8 pr-3 py-2 text-xs font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                activeRegionFilter !== 'ALL'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
              }`}
            >
              <option value="ALL">All regions ({projects.length})</option>
              {sortedRegions.map(([regionName, data]) => (
                <option key={regionName} value={regionName}>
                  {`${regionName} (${data.total})${data.attention > 0 ? ` · ${data.attention} need attention` : ''}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
