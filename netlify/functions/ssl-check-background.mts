import type { Config } from '@netlify/functions';
import { hydrate, flush, saveCheckStatus, readCheckStatus } from '../../server/persistence.js';
import { Storage, getDatabaseState } from '../../server/storage.js';
import { runRoutineSSLCheck, getCheckProgress } from '../../server/scheduler.js';
import { checkSSLCertificate } from '../../server/sslChecker.js';
import { getEmailAlertLogs, saveEmailAlertLog } from '../../server/emailAlerts.js';
import type { BackgroundCheckPayload } from '../../server/backgroundQueue.js';
import type { ProjectRecord } from '../../src/types.js';

const IDLE = { active: false, step: 'idle' as const, total: 0, current: 0, currentDomain: '' };

async function runBatch(ids: string[], progress: { total: number; current: number; currentDomain: string }) {
  const targets = Storage.getAllProjects().filter((p) => ids.includes(p.id));
  progress.total = targets.length;
  const batchSize = 8;
  for (let i = 0; i < targets.length; i += batchSize) {
    await Promise.all(
      targets.slice(i, i + batchSize).map(async (project) => {
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

export default async (req: Request) => {
  const payload = (await req.json().catch(() => ({ mode: 'routine' }))) as BackgroundCheckPayload;
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
};

export const config: Config = {
  background: true,
};
