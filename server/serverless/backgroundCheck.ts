import { hydrate, flush, saveCheckStatus, readCheckStatus } from '../persistence.js';
import { Storage, getDatabaseState } from '../storage.js';
import { runRoutineSSLCheck, getCheckProgress } from '../scheduler.js';
import { checkSSLCertificate } from '../sslChecker.js';
import { getEmailAlertLogs, saveEmailAlertLog } from '../emailAlerts.js';
import type { BackgroundCheckPayload } from '../backgroundQueue.js';
import type { ProjectRecord } from '../../src/types.js';
import { serialize } from './lock.js';

const IDLE = { active: false, step: 'idle' as const, total: 0, current: 0, currentDomain: '' };

// Vercel functions are capped at 300s on Hobby, so scan more sites in parallel than the
// local server does (366 sites at 20 at a time with an 8s timeout stays well under the cap).
const CONCURRENCY = 20;

async function runBatch(ids: string[], progress: { total: number; current: number; currentDomain: string }) {
  const targets = Storage.getAllProjects().filter((p) => ids.includes(p.id));
  progress.total = targets.length;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    await Promise.all(
      targets.slice(i, i + CONCURRENCY).map(async (project) => {
        progress.current++;
        progress.currentDomain = project.url;
        try {
          const result = await checkSSLCertificate(project.url, 8000);
          Storage.updateProjectSSL(project.id, result, 'bulk');
        } catch (err) {
          console.error(`[Background SSL] Error checking ${project.url}:`, err);
        }
      })
    );
  }
}

async function run(payload: BackgroundCheckPayload): Promise<void> {
  const startedAt = new Date().toISOString();

  await hydrate();
  const knownEmailLogIds = new Set(getEmailAlertLogs().map((l) => l.id));
  const knownRunLogIds = new Set(Storage.getScheduledLogs().map((l) => l.id));
  const checkedAtStart = new Map(Storage.getAllProjects().map((p) => [p.id, p.ssl?.lastCheckedAt || null]));

  const batchProgress = { active: true, step: 'checking_ssl' as const, total: 0, current: 0, currentDomain: '' };
  const currentProgress = () => (payload.mode === 'batch' ? batchProgress : getCheckProgress());

  // Publish progress so the dashboard can show the scan is running
  const ticker = setInterval(() => {
    saveCheckStatus({ active: true, startedAt, progress: currentProgress() }).catch(() => {});
  }, 5000);

  try {
    await saveCheckStatus({ active: true, startedAt, progress: currentProgress() });

    if (payload.mode === 'batch') {
      await runBatch(payload.ids || [], batchProgress);
    } else {
      await runRoutineSSLCheck(payload.slot || 'Manual Batch', {
        concurrency: CONCURRENCY,
        // Persist sheet changes (new/removed sites) before the long scan starts
        afterSheetSync: async () => {
          await flush();
          getDatabaseState()!.projects.forEach((p) => checkedAtStart.set(p.id, p.ssl?.lastCheckedAt || null));
        },
      });
    }

    // Merge results into fresh data so edits made during the scan are not overwritten
    const results = new Map<string, Pick<ProjectRecord, 'ssl' | 'history'>>();
    for (const p of Storage.getAllProjects()) {
      if ((p.ssl?.lastCheckedAt || null) !== checkedAtStart.get(p.id)) {
        results.set(p.id, { ssl: p.ssl, history: p.history });
      }
    }
    const newRunLogs = Storage.getScheduledLogs().filter((l) => !knownRunLogIds.has(l.id));
    const newEmailLogs = getEmailAlertLogs().filter((l) => !knownEmailLogIds.has(l.id));

    await hydrate();
    const fresh = getDatabaseState()!;
    fresh.projects = fresh.projects.map((p) => (results.has(p.id) ? { ...p, ...results.get(p.id)! } : p));
    [...newRunLogs].reverse().forEach((log) => Storage.addScheduledLog(log));
    [...newEmailLogs].reverse().forEach((log) => saveEmailAlertLog(log));
    await flush();

    console.log(`[Background SSL] ${payload.mode} check finished: ${results.size} sites updated.`);
  } catch (err) {
    console.error('[Background SSL] Check failed:', err);
  } finally {
    clearInterval(ticker);
    const status = await readCheckStatus().catch(() => null);
    // Only clear the flag if it belongs to this run (or nothing newer was queued)
    if (!status || !status.startedAt || status.startedAt <= startedAt) {
      await saveCheckStatus({ active: false, startedAt: null, progress: IDLE });
    }
  }
}

/** Runs a routine or batch SSL check against the database (one at a time per instance). */
export function runBackgroundCheck(payload: BackgroundCheckPayload): Promise<void> {
  return serialize(() => run(payload));
}
