import type { Config } from '@netlify/functions';
import { hydrate, flush, readGoogleSheetConfig } from '../../server/persistence.js';
import { pullFromGoogleSheet } from '../../server/googleSheetSync.js';

// Periodically pulls the connected Google Sheet so edits made directly in the sheet show up.
export default async () => {
  const config = await readGoogleSheetConfig();
  const sheetUrl = config?.sheetUrl;
  if (!sheetUrl || !sheetUrl.includes('spreadsheets/d/')) return;

  await hydrate();
  const result = await pullFromGoogleSheet(sheetUrl);
  await flush();
  if (!result.success) console.warn('[Sheet Auto-Pull] Failed:', result.message);
};

export const config: Config = {
  schedule: '*/5 * * * *',
};
