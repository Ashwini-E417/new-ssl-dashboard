import type { Config } from '@netlify/functions';
import { queueBackgroundCheck } from '../../server/backgroundQueue.js';
import { readCheckStatus } from '../../server/persistence.js';

// Routine check slots in UTC (IST = UTC + 5:30)
const SLOTS: Record<string, '10:30 AM IST' | '2:30 PM IST' | '6:00 PM IST'> = {
  '5:00': '10:30 AM IST',
  '9:00': '2:30 PM IST',
  '12:30': '6:00 PM IST',
};

export default async () => {
  const now = new Date();
  const minute = now.getUTCMinutes() < 30 ? '00' : '30';
  const slot = SLOTS[`${now.getUTCHours()}:${minute}`];
  if (!slot) return;

  const status = await readCheckStatus();
  if (status?.active && status.startedAt && Date.now() - new Date(status.startedAt).getTime() < 16 * 60 * 1000) {
    console.log(`[SSL Schedule] Skipping ${slot}: a check is already running.`);
    return;
  }

  const origin = process.env.URL;
  if (!origin) {
    console.error('[SSL Schedule] Site URL is not available; cannot start the routine check.');
    return;
  }
  console.log(`[SSL Schedule] Starting routine SSL check for ${slot}.`);
  await queueBackgroundCheck(origin, { mode: 'routine', slot });
};

export const config: Config = {
  // 10:30 AM, 2:30 PM and 6:00 PM IST
  schedule: '0,30 5,9,12 * * *',
};
