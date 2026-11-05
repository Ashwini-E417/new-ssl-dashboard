/**
 * Netlify Database persistence for the serverless deployment.
 *
 * The app's Storage module works on an in-memory document. In serverless mode every
 * function invocation hydrates that document from Postgres before handling a request and
 * flushes only the rows that changed afterwards. On first run the database is seeded from
 * the data bundled in server/data/ so existing sites, logs and settings carry over.
 */
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appState, projects as projectsTable } from '../db/schema.js';
import {
  useExternalPersistence,
  getDatabaseState,
  setDatabaseState,
  readBundledStore,
  buildInitialSeed,
  DatabaseSchema,
} from './storage.js';
import { setEmailState, getEmailState, readBundledEmailState } from './emailAlerts.js';
import { setExternalCheckStatus, CheckProgress } from './scheduler.js';
import type { ProjectRecord } from '../src/types.js';

const KEYS = {
  initialized: 'initialized',
  scheduledLogs: 'scheduledLogs',
  googleSheetConfig: 'googleSheetConfig',
  emailSettings: 'emailSettings',
  emailLogs: 'emailLogs',
  checkStatus: 'checkStatus',
} as const;

export interface CheckStatus {
  active: boolean;
  progress: CheckProgress;
  startedAt: string | null;
}

// Snapshot of what was loaded, used to write back only what changed
let projectSnapshot = new Map<string, string>();
let orderSnapshot: string[] = [];
let stateSnapshot = new Map<string, string>();

useExternalPersistence();

async function upsertState(key: string, value: unknown) {
  await db
    .insert(appState)
    .values({ key, value })
    .onConflictDoUpdate({ target: appState.key, set: { value, updatedAt: sql`now()` } });
}

async function seedIfEmpty() {
  const marker = await db.select({ key: appState.key }).from(appState).where(eq(appState.key, KEYS.initialized));
  if (marker.length > 0) return;

  const store: DatabaseSchema = readBundledStore() || buildInitialSeed();
  const email = readBundledEmailState();

  const rows = store.projects.map((p, i) => ({ id: p.id, position: i, data: p }));
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(projectsTable).values(rows.slice(i, i + 100)).onConflictDoNothing();
  }
  await upsertState(KEYS.scheduledLogs, store.scheduledLogs || []);
  await upsertState(KEYS.googleSheetConfig, store.googleSheetConfig);
  await upsertState(KEYS.emailSettings, email.settings);
  await upsertState(KEYS.emailLogs, email.logs);
  await db
    .insert(appState)
    .values({ key: KEYS.initialized, value: { at: new Date().toISOString() } })
    .onConflictDoNothing();
  console.log(`[Persistence] Seeded database with ${rows.length} projects.`);
}

/** Loads the full application state from Netlify Database into memory. */
export async function hydrate(): Promise<void> {
  await seedIfEmpty();

  const [projectRows, stateRows] = await Promise.all([
    db.select().from(projectsTable).orderBy(asc(projectsTable.position)),
    db.select().from(appState),
  ]);

  const state = new Map(stateRows.map((r) => [r.key, r.value as any]));
  const projects = projectRows.map((r) => r.data as ProjectRecord);

  setDatabaseState({
    projects,
    scheduledLogs: state.get(KEYS.scheduledLogs) || [],
    googleSheetConfig: state.get(KEYS.googleSheetConfig) || buildInitialSeed().googleSheetConfig,
    lastUpdated: new Date().toISOString(),
  });
  setEmailState({
    settings: state.get(KEYS.emailSettings) || {},
    logs: state.get(KEYS.emailLogs) || [],
  });
  setExternalCheckStatus((state.get(KEYS.checkStatus) as CheckStatus) || null);

  projectSnapshot = new Map(projectRows.map((r) => [r.id, JSON.stringify(r.data)]));
  orderSnapshot = projectRows.map((r) => r.id);
  stateSnapshot = new Map(stateRows.map((r) => [r.key, JSON.stringify(r.value)]));
}

/** Writes back only the projects and documents that changed since hydrate(). */
export async function flush(): Promise<void> {
  const current = getDatabaseState();
  if (!current) return;

  const ids = current.projects.map((p) => p.id);
  const orderChanged = ids.length !== orderSnapshot.length || ids.some((id, i) => orderSnapshot[i] !== id);

  const writes: Promise<unknown>[] = [];
  const changedRows: { id: string; position: number; data: ProjectRecord }[] = [];
  current.projects.forEach((p, i) => {
    const json = JSON.stringify(p);
    if (orderChanged || projectSnapshot.get(p.id) !== json) {
      changedRows.push({ id: p.id, position: i, data: p });
    }
  });

  for (let i = 0; i < changedRows.length; i += 100) {
    writes.push(
      db
        .insert(projectsTable)
        .values(changedRows.slice(i, i + 100))
        .onConflictDoUpdate({
          target: projectsTable.id,
          set: {
            position: sql`excluded.position`,
            data: sql`excluded.data`,
            updatedAt: sql`now()`,
          },
        })
    );
  }

  const currentIds = new Set(ids);
  const removed = orderSnapshot.filter((id) => !currentIds.has(id));
  if (removed.length > 0) {
    writes.push(db.delete(projectsTable).where(inArray(projectsTable.id, removed)));
  }

  const email = getEmailState();
  const docs: Record<string, unknown> = {
    [KEYS.scheduledLogs]: current.scheduledLogs || [],
    [KEYS.googleSheetConfig]: current.googleSheetConfig,
  };
  if (email) {
    docs[KEYS.emailSettings] = email.settings;
    docs[KEYS.emailLogs] = email.logs;
  }
  for (const [key, value] of Object.entries(docs)) {
    if (stateSnapshot.get(key) !== JSON.stringify(value)) {
      writes.push(upsertState(key, value));
    }
  }

  await Promise.all(writes);

  projectSnapshot = new Map(current.projects.map((p) => [p.id, JSON.stringify(p)]));
  orderSnapshot = ids;
  for (const [key, value] of Object.entries(docs)) stateSnapshot.set(key, JSON.stringify(value));
}

/** Records whether a background SSL check is running (shared across function invocations). */
export async function saveCheckStatus(status: CheckStatus): Promise<void> {
  await upsertState(KEYS.checkStatus, status);
}

export async function readCheckStatus(): Promise<CheckStatus | null> {
  const rows = await db.select().from(appState).where(eq(appState.key, KEYS.checkStatus));
  return (rows[0]?.value as CheckStatus) || null;
}

/** Reads only the Google Sheet config without loading all projects. */
export async function readGoogleSheetConfig(): Promise<{ sheetUrl?: string } | null> {
  const rows = await db.select().from(appState).where(eq(appState.key, KEYS.googleSheetConfig));
  return (rows[0]?.value as any) || null;
}
