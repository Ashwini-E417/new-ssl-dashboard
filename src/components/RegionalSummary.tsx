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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Campaign Status Summary Pills */}
        <div className="w-full lg:w-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Campaign Distribution
          </span>
          <div className="flex flex-wrap gap-2">
            {(['Active', 'Paused', 'Suspended', 'Not Started', 'Expired'] as CampaignStatus[]).map((status) => {
              const count = campaignMap[status] || 0;
              const isSelected = activeCampaignFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => onSelectCampaign(isSelected ? 'ALL' : status)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
        <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800" />

        {/* Right: Regions Summary Pills */}
        <div className="w-full flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Regional SSL Coverage (Click to Filter)
            </span>
            {activeRegionFilter !== 'ALL' && (
              <button
                onClick={() => onSelectRegion('ALL')}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                Clear Region Filter
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
            {sortedRegions.map(([regionName, data]) => {
              const isSelected = activeRegionFilter === regionName;

              return (
                <button
                  key={regionName}
                  onClick={() => onSelectRegion(isSelected ? 'ALL' : regionName)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{regionName}</span>
                  <span className="font-mono text-[10px] opacity-80">({data.total})</span>
                  {data.attention > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title={`${data.attention} attention required`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
