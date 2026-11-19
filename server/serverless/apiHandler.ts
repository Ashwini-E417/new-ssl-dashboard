import serverless from 'serverless-http';
import { hydrate, flush } from '../persistence.js';
import { createApiApp } from '../app.js';
import { queueBackgroundCheck } from '../backgroundQueue.js';
import { serialize } from './lock.js';

let currentOrigin = '';
const app = createApiApp({
  queueBackgroundCheck: (payload) => queueBackgroundCheck(currentOrigin, payload),
});
const expressHandler = serverless(app);

/**
 * Runs the Express API for one Web Request: loads state from Postgres, handles the
 * request in memory, writes changes back, then responds.
 */
async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  currentOrigin = url.origin;

  // vercel.json rewrites /api/<path> to /api?__path=<path>; restore the original route.
  const rewrittenPath = url.searchParams.get('__path');
  url.searchParams.delete('__path');
  const pathname = rewrittenPath !== null ? `/api/${rewrittenPath.replace(/^\/+/, '')}` : url.pathname;

  await hydrate();

  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : Buffer.from(await req.arrayBuffer()).toString('base64');
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result: any = await expressHandler(
    {
      httpMethod: req.method,
      path: pathname,
      headers,
      queryStringParameters: Object.fromEntries(url.searchParams),
      body,
      isBase64Encoded: true,
    },
    {}
  );

  try {
    await flush();
  } catch (err) {
    console.error('[API] Failed to persist changes:', err);
    return Response.json({ error: 'Failed to save changes to the database' }, { status: 500 });
  }

  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(result.headers || {})) {
    if (value !== undefined) responseHeaders.set(key, String(value));
  }
  for (const [key, values] of Object.entries(result.multiValueHeaders || {})) {
    for (const v of values as string[]) responseHeaders.append(key, v);
  }
  const payload = result.body ? Buffer.from(result.body, result.isBase64Encoded ? 'base64' : 'utf8') : null;
  return new Response(payload, { status: result.statusCode || 200, headers: responseHeaders });
}

export async function handleApiRequest(req: Request): Promise<Response> {
  try {
    // State lives in module memory, so requests sharing an instance must not overlap.
    return await serialize(() => handle(req));
  } catch (err: any) {
    console.error('[API] Request failed:', err);
    return Response.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
