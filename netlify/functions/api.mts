import type { Config } from '@netlify/functions';
import serverless from 'serverless-http';
import { hydrate, flush } from '../../server/persistence.js';
import { createApiApp } from '../../server/app.js';
import { queueBackgroundCheck } from '../../server/backgroundQueue.js';

let currentOrigin = '';
const app = createApiApp({
  queueBackgroundCheck: (payload) => queueBackgroundCheck(currentOrigin, payload),
});
const expressHandler = serverless(app);

export default async (req: Request) => {
  const url = new URL(req.url);
  currentOrigin = url.origin;

  await hydrate();

  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : Buffer.from(await req.arrayBuffer()).toString('base64');
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result: any = await expressHandler(
    {
      httpMethod: req.method,
      path: url.pathname,
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
};

export const config: Config = {
  path: '/api/*',
};
