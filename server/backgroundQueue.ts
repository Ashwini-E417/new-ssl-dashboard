import { saveCheckStatus } from './persistence.js';

export type BackgroundCheckPayload =
  | { mode: 'routine'; slot?: '10:30 AM IST' | '2:30 PM IST' | '6:00 PM IST' | 'Manual Batch' }
  | { mode: 'batch'; ids: string[] };

/** Marks a check as running and hands it to the ssl-check background function. */
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

  const res = await fetch(`${origin}/.netlify/functions/ssl-check-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 202) {
    await saveCheckStatus({
      active: false,
      startedAt: null,
      progress: { active: false, step: 'idle', total: 0, current: 0, currentDomain: '' },
    });
    throw new Error(`Could not start background SSL check (HTTP ${res.status})`);
  }
}
