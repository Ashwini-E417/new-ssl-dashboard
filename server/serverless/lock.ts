/**
 * Vercel Fluid compute can run several requests at once in one instance. The app keeps
 * its working state in module-level memory (hydrated from Postgres per request), so work
 * that touches that state is run one at a time per instance.
 */
let tail: Promise<unknown> = Promise.resolve();

export function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => {});
  return run;
}

/** Shared-secret check for the internal and cron endpoints (enabled when CRON_SECRET is set). */
export function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}
