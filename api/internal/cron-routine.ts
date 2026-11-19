import { runBackgroundCheck } from '../../server/serverless/backgroundCheck.js';
import { readCheckStatus } from '../../server/persistence.js';
import { STALE_CHECK_MS } from '../../server/scheduler.js';
import { isAuthorized } from '../../server/serverless/lock.js';

type Slot = '10:30 AM IST' | '2:30 PM IST' | '6:00 PM IST';

// Cron jobs in vercel.json fire at 05:00, 09:00 and 12:30 UTC (10:30 AM, 2:30 PM, 6:00 PM IST).
// Vercel sends the matching schedule in x-vercel-cron-schedule; on the Hobby plan a job can
// fire up to 59 minutes late, so the UTC hour range is used as a fallback.
const SLOT_BY_SCHEDULE: Record<string, Slot> = {
  '0 5 * * *': '10:30 AM IST',
  '0 9 * * *': '2:30 PM IST',
  '30 12 * * *': '6:00 PM IST',
};

function slotFor(req: Request, now = new Date()): Slot {
  const fromHeader = SLOT_BY_SCHEDULE[req.headers.get('x-vercel-cron-schedule') || ''];
  if (fromHeader) return fromHeader;
  const hour = now.getUTCHours();
  if (hour < 8) return '10:30 AM IST';
  if (hour < 11) return '2:30 PM IST';
  return '6:00 PM IST';
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 });

    const slot = slotFor(req);
    const status = await readCheckStatus();
    if (status?.active && status.startedAt && Date.now() - new Date(status.startedAt).getTime() < STALE_CHECK_MS) {
      console.log(`[SSL Schedule] Skipping ${slot}: a check is already running.`);
      return Response.json({ skipped: true, slot });
    }

    console.log(`[SSL Schedule] Starting routine SSL check for ${slot}.`);
    await runBackgroundCheck({ mode: 'routine', slot });
    return Response.json({ success: true, slot });
  },
};
