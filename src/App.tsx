import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ProjectRecord,
  DashboardStats,
  FilterOptions,
  CampaignStatus,
  ReraQrStatus,
  GoogleSheetConfig,
  ScheduledRunLog,
} from './types';
import { Header, DashboardPage } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { AttentionBanner } from './components/AttentionBanner';
import { RegionalSummary } from './components/RegionalSummary';
import { RegionCampaignGrid } from './components/RegionCampaignGrid';
import { FilterToolbar } from './components/FilterToolbar';
import { ProjectTable } from './components/ProjectTable';
import { AddProjectModal } from './components/AddProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
import { SSLDetailModal } from './components/SSLDetailModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { SchedulerModal } from './components/SchedulerModal';
import { EmailAlertsModal } from './components/EmailAlertsModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

const DEFAULT_FILTERS: FilterOptions = {
  search: '',
  campaignStatus: 'ALL',
  reraQrStatus: 'ALL',
  region: 'ALL',
  server: 'ALL',
  sslStatus: 'ALL',
  daysRemainingFilter: 'all',
};

export default function App() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeCampaigns: 0,
    pausedCampaigns: 0,
    suspendedCampaigns: 0,
    notStartedCampaigns: 0,
    sslValid: 0,
    sslExpiringSoon: 0,
    sslExpired: 0,
    sslFailed: 0,
    sslUntested: 0,
    reraIssuesCount: 0,
    attentionRequiredCount: 0,
  });

  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(null);
  const [scheduledLogs, setScheduledLogs] = useState<ScheduledRunLog[]>([]);

  // IST & Scheduler State
  const [istTime, setIstTime] = useState('');
  const [istDate, setIstDate] = useState('');
  const [nextSlotLabel, setNextSlotLabel] = useState('10:30 AM IST');
  const [nextSlotSeconds, setNextSlotSeconds] = useState(3600);
  const [scheduledSlots, setScheduledSlots] = useState<string[]>([
    '10:30 AM IST',
    '2:30 PM IST',
    '6:00 PM IST',
  ]);
  const [isServerChecking, setIsServerChecking] = useState(false);

  // Table selection & loading states
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIds, setCheckingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Two-page dashboard: Overview (summary) and Projects (filters + table).
  // Kept in the URL hash so refresh and browser back/forward work.
  const readPageFromHash = (): DashboardPage =>
    typeof window !== 'undefined' && window.location.hash === '#projects' ? 'projects' : 'overview';
  const [activePage, setActivePage] = useState<DashboardPage>(readPageFromHash);

  useEffect(() => {
    const onHashChange = () => setActivePage(readPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = useCallback((page: DashboardPage) => {
    setActivePage(page);
    if (window.location.hash !== `#${page}`) {
      window.history.pushState(null, '', `#${page}`);
    }
    window.scrollTo({ top: 0 });
  }, []);

  // Wraps a filter action so it also opens the Projects page where the result is visible.
  const andShowProjects =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      fn(...args);
      navigateTo('projects');
    };
  const [sortField, setSortField] = useState<string>('campaignStatus');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [detailProject, setDetailProject] = useState<ProjectRecord | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSchedulerModalOpen, setIsSchedulerModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      const [projRes, statsRes, schedRes, configRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/stats'),
        fetch('/api/ssl/scheduler-status'),
        fetch('/api/sheets/config'),
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
      if (schedRes.ok) {
        const scData = await schedRes.json();
        setIstTime(scData.currentIST);
        setIstDate(scData.currentISTDate);
        setNextSlotLabel(scData.nextSlotLabel);
        setNextSlotSeconds(scData.nextSlotRemainingSeconds);
        setScheduledSlots(scData.scheduledSlots || []);
        setIsServerChecking(scData.isCheckingNow);
        if (scData.lastRun) {
          setScheduledLogs([scData.lastRun]);
        }
      }
      if (configRes.ok) {
        const cData = await configRes.json();
        setSheetConfig(cData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Local IST Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNextSlotSeconds((prev) => Math.max(0, prev - 1));

      // Compute client-side IST time
      const date = new Date();
      const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
      const ist = new Date(utcTime + 330 * 60000);
      const hours = ist.getHours();
      const minutes = ist.getMinutes();
      const seconds = ist.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      setIstTime(
        `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm} IST`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Poll scheduler status & stats every 25 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [schedRes, statsRes] = await Promise.all([
          fetch('/api/ssl/scheduler-status'),
          fetch('/api/stats'),
        ]);
        if (schedRes.ok) {
          const scData = await schedRes.json();
          setNextSlotLabel(scData.nextSlotLabel);
          setNextSlotSeconds(scData.nextSlotRemainingSeconds);
          setIsServerChecking(scData.isCheckingNow);
        }
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (e) {
        // Silent poll error
      }
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  // Collect unique regions from data
  const existingRegions = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.region && p.region.trim()) {
        set.add(p.region.trim());
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  // Expiring in next 4 days count (excluding Suspended & Expired)
  const expiringIn4DaysCount = useMemo(() => {
    return projects.filter(
      (p) =>
        p.campaignStatus !== 'Suspended' &&
        p.campaignStatus !== 'Expired' &&
        p.ssl &&
        typeof p.ssl.daysRemaining === 'number' &&
        p.ssl.daysRemaining <= 4
    ).length;
  }, [projects]);

  // Check SSL on single project
  const handleCheckSSL = async (id: string) => {
    setCheckingIds((prev) => [...prev, id]);
    try {
      const res = await fetch(`/api/ssl/check/${id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? data.project : p))
        );
        if (detailProject && detailProject.id === id) {
          setDetailProject(data.project);
        }
        // Refresh stats
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) setStats(await statsRes.json());

        const days = data.ssl?.daysRemaining;
        const msg =
          data.ssl.status === 'valid'
            ? `SSL Valid (${days} days left)`
            : data.ssl.status === 'expiring_soon'
            ? `SSL Expiring Soon (${days} days left!)`
            : `SSL Issue: ${data.ssl.error || data.ssl.status}`;
        showToast(`Checked ${data.project.url}: ${msg}`, data.ssl.status === 'valid' ? 'success' : 'error');
      } else {
        showToast(data.error || 'SSL check failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'SSL check error', 'error');
    } finally {
      setCheckingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Trigger Routine Check (syncs sheet, checks all non-suspended/expired sites, emails <=4 days)
  const handleTriggerBatchCheck = async () => {
    setIsServerChecking(true);
    showToast('Syncing latest list from sheet & running routine SSL scan...', 'info');
    try {
      const res = await fetch('/api/ssl/trigger-scheduled', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.log) {
        const in4d = data.log.expiringIn4DaysCount ?? 0;
        const emailNotice = in4d > 0
          ? ` • Alert email dispatched to ashwini.poojary@homesfy.in (${in4d} site${in4d === 1 ? '' : 's'} in ≤4d)`
          : '';
        showToast(
          `Routine Check Complete: Checked ${data.log.checkedCount} sites (${data.log.validCount} valid, ${data.log.expiringCount} soon, ${data.log.failedCount} failed)${emailNotice}.`,
          'success'
        );
        await fetchData();
      } else {
        showToast(data.error || 'Routine check failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Routine check error', 'error');
    } finally {
      setIsServerChecking(false);
    }
  };

  // Bulk check selected projects
  const handleBulkCheckSSL = async () => {
    if (selectedIds.length === 0) return;
    showToast(`Initiating SSL check for ${selectedIds.length} selected projects...`, 'info');
    try {
      const res = await fetch('/api/ssl/check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully checked ${data.checkedCount} projects.`, 'success');
        await fetchData();
        setSelectedIds([]);
      } else {
        showToast(data.error || 'Bulk check failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error executing bulk check', 'error');
    }
  };

  // Add project
  const handleAddProject = async (data: any) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to add project');
    }
    setProjects((prev) => [result, ...prev]);
    const syncText = result.syncResult?.configured && result.syncResult?.success
      ? ' (Synced to Google Sheet & Excel)'
      : ' (Saved in Excel)';
    showToast(`Added project "${result.url}"${syncText}`);
    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) setStats(await statsRes.json());
  };

  // Save edit project
  const handleSaveEditProject = async (
    id: string,
    updates: Partial<ProjectRecord>,
    checkSslNow: boolean
  ) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update project');
    }

    setProjects((prev) => prev.map((p) => (p.id === id ? result : p)));
    const syncText = result.syncResult?.configured && result.syncResult?.success
      ? ' (Synced to Google Sheet & Excel)'
      : ' (Saved in Excel)';
    showToast(`Updated campaign details for ${result.url}${syncText}`);

    if (checkSslNow) {
      handleCheckSSL(id);
    }
    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) setStats(await statsRes.json());
  };

  // Delete project
  const handleDeleteProject = async (project: ProjectRecord) => {
    if (!window.confirm(`Are you sure you want to delete "${project.url}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        setSelectedIds((prev) => prev.filter((id) => id !== project.id));
        showToast(`Project "${project.url}" removed (Updated in Excel).`);
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) setStats(await statsRes.json());
      } else {
        showToast('Failed to delete project', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Delete error', 'error');
    }
  };

  // Quick inline update status
  const handleQuickUpdateStatus = async (id: string, newStatus: CampaignStatus) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignStatus: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        const syncText = updated.syncResult?.configured && updated.syncResult?.success
          ? ' (Synced to Google Sheet & Excel)'
          : ' (Saved in Excel)';
        showToast(`Campaign status changed to ${newStatus}${syncText}`);
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    }
  };

  // Quick inline update RERA
  const handleQuickUpdateRera = async (id: string, newRera: ReraQrStatus) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reraQrStatus: newRera }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        const syncText = updated.syncResult?.configured && updated.syncResult?.success
          ? ' (Synced to Google Sheet & Excel)'
          : ' (Saved in Excel)';
        showToast(`RERA QR status changed to ${newRera}${syncText}`);
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    }
  };

  // Quick inline update Image Optimize
  const handleQuickUpdateImageOptimize = async (id: string, newOptimize: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageOptimize: newOptimize }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        const syncText = updated.syncResult?.configured && updated.syncResult?.success
          ? ' (Synced to Google Sheet & Excel)'
          : ' (Saved in Excel)';
        showToast(`Image optimize set to "${newOptimize}"${syncText}`);
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    }
  };

  // Bulk update Campaign
  const handleBulkUpdateCampaign = async (status: CampaignStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/projects/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates: { campaignStatus: status } }),
      });
      if (res.ok) {
        showToast(`Updated ${selectedIds.length} projects to "${status}" (Saved in Excel).`);
        await fetchData();
        setSelectedIds([]);
      }
    } catch (e: any) {
      showToast(e.message || 'Bulk update failed', 'error');
    }
  };

  // Bulk update RERA
  const handleBulkUpdateRera = async (status: ReraQrStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/projects/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates: { reraQrStatus: status } }),
      });
      if (res.ok) {
        showToast(`Updated ${selectedIds.length} projects to RERA "${status}" (Saved in Excel).`);
        await fetchData();
        setSelectedIds([]);
      }
    } catch (e: any) {
      showToast(e.message || 'Bulk update failed', 'error');
    }
  };

  // Bulk update Image Optimize
  const handleBulkUpdateImageOptimize = async (status: string) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/projects/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates: { imageOptimize: status } }),
      });
      if (res.ok) {
        showToast(`Updated ${selectedIds.length} projects to Image Optimize "${status}" (Saved in Excel).`);
        await fetchData();
        setSelectedIds([]);
      }
    } catch (e: any) {
      showToast(e.message || 'Bulk update failed', 'error');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected landing pages permanently?`)) return;

    try {
      const res = await fetch('/api/projects/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        showToast(`Deleted ${selectedIds.length} projects.`);
        await fetchData();
        setSelectedIds([]);
      }
    } catch (e: any) {
      showToast(e.message || 'Bulk delete failed', 'error');
    }
  };

  // Google Sheet Config save
  const handleSaveSheetConfig = async (updates: Partial<GoogleSheetConfig>) => {
    const res = await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setSheetConfig(updated);
    }
  };

  // Google Sheet Pull Sync
  const handlePullSync = async (sheetUrl?: string) => {
    const res = await fetch('/api/sheets/sync-pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl }),
    });
    const outcome = await res.json();
    if (outcome.success) {
      await fetchData();
    }
    return outcome;
  };

  // Export CSV
  const handleExportCsv = () => {
    window.location.href = '/api/sheets/export-csv';
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    window.location.href = '/api/sheets/export-excel';
    showToast('Downloading latest updated Excel spreadsheet (.xlsx)...', 'info');
  };

  // Import CSV
  const handleImportCsv = async (csvContent: string) => {
    const res = await fetch('/api/sheets/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchData();
    }
    return data;
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Sorting
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtering calculation
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const matchesUrl = project.url.toLowerCase().includes(query);
        const matchesRegion = project.region.toLowerCase().includes(query);
        const matchesComment = project.comment.toLowerCase().includes(query);
        const matchesServer = project.server.toLowerCase().includes(query);
        const matchesIssuer = (project.ssl?.issuer || '').toLowerCase().includes(query);
        if (!matchesUrl && !matchesRegion && !matchesComment && !matchesServer && !matchesIssuer) {
          return false;
        }
      }

      // Campaign status
      if (filters.campaignStatus !== 'ALL' && project.campaignStatus !== filters.campaignStatus) {
        return false;
      }

      // RERA QR status
      if (filters.reraQrStatus !== 'ALL' && project.reraQrStatus !== filters.reraQrStatus) {
        return false;
      }

      // Region
      if (filters.region !== 'ALL' && project.region !== filters.region) {
        return false;
      }

      // Server
      if (filters.server !== 'ALL' && project.server !== filters.server) {
        return false;
      }

      // SSL Status
      if (filters.sslStatus !== 'ALL') {
        if (filters.sslStatus === 'attention') {
          const status = project.ssl?.status;
          const isProblemSSL =
            status === 'expired' || status === 'invalid' || status === 'expiring_soon';
          if (!isProblemSSL) return false;
        } else if (project.ssl?.status !== filters.sslStatus) {
          return false;
        }
      }

      // Days remaining filter
      if (filters.daysRemainingFilter !== 'all') {
        const days = project.ssl?.daysRemaining;
        if (days === null || days === undefined) return false;

        if (filters.daysRemainingFilter === '4' || filters.daysRemainingFilter === 'lt4') {
          if (days > 4) return false;
          // Routine alert policy excludes Suspended and Expired campaign status when all campaigns are evaluated
          if (filters.campaignStatus === 'ALL' && (project.campaignStatus === 'Suspended' || project.campaignStatus === 'Expired')) {
            return false;
          }
        } else if (filters.daysRemainingFilter === '7' || filters.daysRemainingFilter === 'lt7') {
          if (days > 7 || days <= 0) return false;
        } else if (filters.daysRemainingFilter === '15' || filters.daysRemainingFilter === 'lt15') {
          if (days > 15 || days <= 0) return false;
        } else if (filters.daysRemainingFilter === '30' || filters.daysRemainingFilter === 'lt30') {
          if (days > 30 || days <= 0) return false;
        } else if (filters.daysRemainingFilter === 'expired') {
          if (days > 0) return false;
        }
      }

      return true;
    });
  }, [projects, filters]);

  // Sorted projects calculation
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'url':
          valA = a.url.toLowerCase();
          valB = b.url.toLowerCase();
          break;
        case 'campaignStatus': {
          const order: Record<CampaignStatus, number> = {
            Active: 1,
            Paused: 2,
            Suspended: 3,
            'Not Started': 4,
            Expired: 5,
          };
          valA = order[a.campaignStatus] || 6;
          valB = order[b.campaignStatus] || 6;
          break;
        }
        case 'sslStatus': {
          const order: Record<string, number> = {
            expired: 1,
            invalid: 2,
            expiring_soon: 3,
            untested: 4,
            valid: 5,
          };
          valA = order[a.ssl?.status || 'untested'] || 6;
          valB = order[b.ssl?.status || 'untested'] || 6;
          break;
        }
        case 'sslExpiry':
          valA = a.ssl?.daysRemaining ?? 9999;
          valB = b.ssl?.daysRemaining ?? 9999;
          break;
        case 'region':
          valA = a.region.toLowerCase();
          valB = b.region.toLowerCase();
          break;
        case 'server':
          valA = a.server.toLowerCase();
          valB = b.server.toLowerCase();
          break;
        case 'reraQrStatus':
          valA = a.reraQrStatus.toLowerCase();
          valB = b.reraQrStatus.toLowerCase();
          break;
        default:
          valA = a.url;
          valB = b.url;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortField, sortDirection]);

  // Shortcut to toggle filtering for sites expiring in <= 4 days
  const handleToggleFilterExpiring4Days = () => {
    setCurrentPage(1);
    setFilters((prev) => {
      const willBeActive = prev.daysRemainingFilter !== '4';
      return {
        ...prev,
        daysRemainingFilter: willBeActive ? '4' : 'all',
        sslStatus: 'ALL',
        ...(willBeActive && (prev.campaignStatus === 'Suspended' || prev.campaignStatus === 'Expired')
          ? { campaignStatus: 'ALL' }
          : {}),
      };
    });
  };

  // Shortcut to filter from stats cards
  const handleFilterSelectFromCard = (filterType: string, value: string) => {
    setCurrentPage(1);
    if (filterType === 'all') {
      setFilters(DEFAULT_FILTERS);
    } else if (filterType === 'campaignStatus') {
      setFilters({ ...DEFAULT_FILTERS, campaignStatus: value as CampaignStatus });
    } else if (filterType === 'sslStatus') {
      setFilters({ ...DEFAULT_FILTERS, sslStatus: value as any });
    } else if (filterType === 'daysRemainingFilter') {
      setFilters({
        ...DEFAULT_FILTERS,
        daysRemainingFilter: value as any,
      });
    } else if (filterType === 'reraIssues') {
      setFilters({
        ...DEFAULT_FILTERS,
        campaignStatus: 'Active',
        reraQrStatus: 'Not Working',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Header
        istTime={istTime}
        nextSlotLabel={nextSlotLabel}
        nextSlotSeconds={nextSlotSeconds}
        activeCount={stats.activeCampaigns}
        isCheckingNow={isServerChecking}
        onTriggerBatchCheck={handleTriggerBatchCheck}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenSchedulerModal={() => setIsSchedulerModalOpen(true)}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
        onFilterExpiring4Days={andShowProjects(handleToggleFilterExpiring4Days)}
        isExpiring4DaysFiltered={filters.daysRemainingFilter === '4'}
        expiringIn4DaysCount={expiringIn4DaysCount}
        sheetConfig={sheetConfig}
        attentionCount={stats.attentionRequiredCount}
        projects={projects}
        onOpenNotificationDrawer={() => setIsNotificationDrawerOpen(true)}
        activePage={activePage}
        onNavigate={navigateTo}
        totalProjects={projects.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activePage === 'overview' ? (
          <>
        {/* Critical Attention Banner */}
        <AttentionBanner
          stats={stats}
          onFilterAttention={andShowProjects(() => {
            setFilters((prev) => ({
              ...prev,
              sslStatus: prev.sslStatus === 'attention' ? 'ALL' : 'attention',
            }));
            setCurrentPage(1);
          })}
          isAttentionFiltered={filters.sslStatus === 'attention'}
          expiringIn4DaysCount={expiringIn4DaysCount}
          onFilterExpiring4Days={andShowProjects(handleToggleFilterExpiring4Days)}
          isExpiring4DaysFiltered={filters.daysRemainingFilter === '4'}
        />

        {/* Top 6 KPI Metric Cards */}
        <StatsOverview
          stats={stats}
          onFilterSelect={andShowProjects(handleFilterSelectFromCard)}
          activeFilter={
            filters.sslStatus !== 'ALL'
              ? filters.sslStatus
              : filters.campaignStatus !== 'ALL'
              ? filters.campaignStatus
              : 'ALL'
          }
          expiringIn4DaysCount={expiringIn4DaysCount}
        />

        {/* Campaign count per region */}
        <RegionCampaignGrid
          projects={projects}
          onSelect={andShowProjects((region: string, campaignStatus: CampaignStatus | 'ALL') => {
            setFilters({ ...DEFAULT_FILTERS, region, campaignStatus });
            setCurrentPage(1);
          })}
        />


            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigateTo('projects')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
              >
                View all {projects.length} projects
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
        {/* Campaign & Regional Distribution Summary */}
        <RegionalSummary
          projects={projects}
          activeRegionFilter={filters.region}
          activeCampaignFilter={filters.campaignStatus}
          onSelectRegion={(reg: string) => {
            setFilters((prev) => ({
              ...prev,
              region: prev.region === reg ? 'ALL' : reg,
            }));
            setCurrentPage(1);
          }}
          onSelectCampaign={(camp: CampaignStatus | 'ALL') => {
            setFilters((prev) => ({
              ...prev,
              campaignStatus: camp,
            }));
            setCurrentPage(1);
          }}
        />

        {/* Filter & Search Toolbar */}
        <FilterToolbar
          filters={filters}
          onFilterChange={(updates) => {
            setFilters((prev) => ({ ...prev, ...updates }));
            setCurrentPage(1);
          }}
          onResetFilters={() => {
            setFilters(DEFAULT_FILTERS);
            setCurrentPage(1);
          }}
          totalFilteredCount={filteredProjects.length}
          totalAllCount={projects.length}
          expiringIn4DaysCount={expiringIn4DaysCount}
          onExportCsv={handleExportCsv}
          onExportExcel={handleExportExcel}
          onOpenImportModal={() => setIsSyncModalOpen(true)}
        />

        {/* Master Projects Table with Inline Controls & Bulk Actions */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Loading Google Sheet SSL Monitoring Dashboard...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Synchronizing 330+ real estate campaign landing pages
            </p>
          </div>
        ) : (
          <ProjectTable
            projects={sortedProjects}
            selectedIds={selectedIds}
            onToggleSelectAll={handleToggleSelectAll}
            onToggleSelectRow={handleToggleSelectRow}
            onCheckSSL={handleCheckSSL}
            checkingIds={checkingIds}
            onOpenSSLDetail={(proj) => setDetailProject(proj)}
            onOpenEditModal={(proj) => setEditingProject(proj)}
            onDeleteProject={handleDeleteProject}
            onQuickUpdateStatus={handleQuickUpdateStatus}
            onQuickUpdateRera={handleQuickUpdateRera}
            onQuickUpdateImageOptimize={handleQuickUpdateImageOptimize}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onBulkCheckSSL={handleBulkCheckSSL}
            onBulkUpdateCampaign={handleBulkUpdateCampaign}
            onBulkUpdateRera={handleBulkUpdateRera}
            onBulkUpdateImageOptimize={handleBulkUpdateImageOptimize}
            onBulkDelete={handleBulkDelete}
            onClearSelection={() => setSelectedIds([])}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
          </>
        )}
      </main>

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProject={handleAddProject}
        existingRegions={existingRegions}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleSaveEditProject}
        existingRegions={existingRegions}
      />

      {/* SSL Detail & TLS Inspector Modal */}
      <SSLDetailModal
        isOpen={!!detailProject}
        project={detailProject}
        onClose={() => setDetailProject(null)}
        onRecheckSSL={handleCheckSSL}
        isChecking={detailProject ? checkingIds.includes(detailProject.id) : false}
      />

      {/* Google Sheet Sync & Integration Modal */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={sheetConfig}
        onSaveConfig={handleSaveSheetConfig}
        onPullSync={handlePullSync}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        onImportCsv={handleImportCsv}
        onRefreshData={fetchData}
      />

      {/* Automated IST Scheduler Modal */}
      <SchedulerModal
        isOpen={isSchedulerModalOpen}
        onClose={() => setIsSchedulerModalOpen(false)}
        istTime={istTime}
        istDate={istDate}
        nextSlotLabel={nextSlotLabel}
        nextSlotSeconds={nextSlotSeconds}
        scheduledSlots={scheduledSlots}
        activeCount={stats.activeCampaigns}
        logs={scheduledLogs}
        onTriggerCheckNow={handleTriggerBatchCheck}
        isChecking={isServerChecking}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
        expiringIn4DaysCount={expiringIn4DaysCount}
      />

      {/* Email Alerts Modal */}
      <EmailAlertsModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onRefreshData={fetchData}
        onFilterInTable={andShowProjects(handleToggleFilterExpiring4Days)}
      />

      {/* Real-time Alerts / Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        projects={projects}
        onSelectProject={(p) => setDetailProject(p)}
        onRecheckCritical={() => {
          const criticalIds = projects
            .filter((p) => p.ssl?.status === 'expired' || p.ssl?.status === 'invalid' || p.ssl?.status === 'expiring_soon')
            .map((p) => p.id);
          if (criticalIds.length > 0) {
            setSelectedIds(criticalIds);
            handleBulkCheckSSL();
          }
        }}
        isRechecking={isServerChecking}
      />
    </div>
  );
}
