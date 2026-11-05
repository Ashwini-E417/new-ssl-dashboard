import React, { useMemo } from 'react';
import { Globe } from 'lucide-react';
import { ProjectRecord, CampaignStatus } from '../types';

interface RegionCampaignGridProps {
  projects: ProjectRecord[];
  /** Open the Projects page filtered to a region (and optionally a campaign status). */
  onSelect: (region: string, campaignStatus: CampaignStatus | 'ALL') => void;
}

type RegionCounts = {
  name: string;
  total: number;
  Active: number;
  Paused: number;
  Suspended: number;
  'Not Started': number;
  Expired: number;
};

// Segments drawn in the bar; anything else (Pending/Expired) shows as the empty track.
const BAR_SEGMENTS: { status: CampaignStatus; className: string }[] = [
  { status: 'Active', className: 'bg-emerald-500' },
  { status: 'Paused', className: 'bg-amber-500' },
  { status: 'Suspended', className: 'bg-rose-500' },
];

const CHIPS: { status: CampaignStatus; label: string; dot: string; value: string }[] = [
  { status: 'Active', label: 'Active', dot: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400' },
  { status: 'Paused', label: 'Paused', dot: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400' },
  { status: 'Suspended', label: 'Suspended', dot: 'bg-rose-500', value: 'text-rose-600 dark:text-rose-400' },
  { status: 'Not Started', label: 'Pending', dot: 'bg-indigo-500', value: 'text-indigo-600 dark:text-indigo-400' },
  { status: 'Expired', label: 'Expired', dot: 'bg-slate-400', value: 'text-slate-600 dark:text-slate-300' },
];

export const RegionCampaignGrid: React.FC<RegionCampaignGridProps> = ({ projects, onSelect }) => {
  const regions = useMemo(() => {
    const map = new Map<string, RegionCounts>();
    for (const p of projects) {
      const name = (p.region || 'General').trim();
      const r =
        map.get(name) ??
        { name, total: 0, Active: 0, Paused: 0, Suspended: 0, 'Not Started': 0, Expired: 0 };
      r.total++;
      if (p.campaignStatus in r) r[p.campaignStatus]++;
      map.set(name, r);
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [projects]);

  if (regions.length === 0) return null;

  return (
    <section className="mb-6" aria-labelledby="campaigns-by-region-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-3">
        <h2
          id="campaigns-by-region-heading"
          className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"
        >
          <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Campaigns by Region
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Active · Paused · Suspended per region — click to open in Projects
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {regions.map((r) => (
          <div
            key={r.name}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(r.name, 'ALL')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(r.name, 'ALL');
              }
            }}
            className="group min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:border-emerald-400/60 dark:hover:border-emerald-500/40 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title={`Show ${r.name} projects`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {r.name}
              </h3>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                {r.total} total
              </span>
            </div>

            {/* Stacked distribution bar */}
            <div
              className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="img"
              aria-label={`${r.Active} active, ${r.Paused} paused, ${r.Suspended} suspended of ${r.total}`}
            >
              {BAR_SEGMENTS.map(({ status, className }) =>
                r[status] > 0 ? (
                  <div
                    key={status}
                    className={`${className} h-full rounded-full`}
                    style={{ width: `${(r[status] / r.total) * 100}%` }}
                  />
                ) : null
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {CHIPS.filter((c) => c.status !== 'Expired' || r.Expired > 0).map((c) => (
                <button
                  key={c.status}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(r.name, c.status);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  title={`Show ${c.label.toLowerCase()} campaigns in ${r.name}`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {c.label}
                  <span className={`font-bold ${c.value}`}>{r[c.status]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
