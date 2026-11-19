import { waitUntil } from '@vercel/functions';
import { runBackgroundCheck } from '../../server/serverless/backgroundCheck.js';
import { isAuthorized } from '../../server/serverless/lock.js';
import type { BackgroundCheckPayload } from '../../server/backgroundQueue.js';

// Background worker for long SSL scans. Responds immediately and keeps running
// after the response (up to maxDuration in vercel.json).
export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 });

    const payload = (await req.json().catch(() => ({ mode: 'routine' }))) as BackgroundCheckPayload;
    waitUntil(runBackgroundCheck(payload));
    return Response.json({ queued: true }, { status: 202 });
  },
};
