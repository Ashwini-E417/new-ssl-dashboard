import { hydrate, flush, readGoogleSheetConfig } from '../../server/persistence.js';
import { pullFromGoogleSheet } from '../../server/googleSheetSync.js';
import { isAuthorized, serialize } from '../../server/serverless/lock.js';

// Pulls the connected Google Sheet so edits made directly in the sheet show up.
// Not scheduled in vercel.json (the Hobby plan only allows daily crons); call it from an
// external pinger such as cron-job.org with "Authorization: Bearer <CRON_SECRET>" if needed.
// Routine SSL checks already sync the sheet before scanning.
export default {
  async fetch(req: Request): Promise<Response> {
    if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 });

    const config = await readGoogleSheetConfig();
    const sheetUrl = config?.sheetUrl;
    if (!sheetUrl || !sheetUrl.includes('spreadsheets/d/')) {
      return Response.json({ skipped: true, reason: 'No Google Sheet connected' });
    }

    const result = await serialize(async () => {
      await hydrate();
      const res = await pullFromGoogleSheet(sheetUrl);
      await flush();
      return res;
    });
    if (!result.success) console.warn('[Sheet Auto-Pull] Failed:', result.message);
    return Response.json(result, { status: result.success ? 200 : 502 });
  },
};
