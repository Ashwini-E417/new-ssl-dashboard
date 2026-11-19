import { saveCheckStatus } from './persistence.js';

export type BackgroundCheckPayload =
  | { mode: 'routine'; slot?: '10:30 AM IST' | '2:30 PM IST' | '6:00 PM IST' | 'Manual Batch' }
  | { mode: 'batch'; ids: string[] };

/** Marks a check as running and hands it to the /api/internal/ssl-check function. */
export async function queueBackgroundCheck(origin: string, payload: BackgroundCheckPayload): Promise<void> {
  await saveCheckStatus({
    active: true,
    startedAt: new Date().toISOString(),
    progress: {
      active: true,
      step: payload.mode === 'routine' ? 'syncing_sheet' : 'checking_ssl',
      total: payload.mode === 'batch' ? payload.ids.length : 0,
      current: 0,
      currentDomain: 'Queued...',
    },
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.CRON_SECRET) headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
  // Lets the call through Vercel Deployment Protection on preview deployments
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  const res = await fetch(`${origin}/api/internal/ssl-check`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res) {
    await saveCheckStatus({
      active: false,
      startedAt: null,
      progress: { active: false, step: 'idle', total: 0, current: 0, currentDomain: '' },
    });
    throw new Error('Could not reach the background SSL check function');
  }

  if (!res.ok && res.status !== 202) {
    await saveCheckStatus({
      active: false,
      startedAt: null,
      progress: { active: false, step: 'idle', total: 0, current: 0, currentDomain: '' },
    });
    throw new Error(`Could not start background SSL check (HTTP ${res.status})`);
  }
}
