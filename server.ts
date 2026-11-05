import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.js';
import { Storage } from './server/storage.js';
import { startScheduler } from './server/scheduler.js';
import { pullFromGoogleSheet } from './server/googleSheetSync.js';
import { saveLatestExcelToDisk } from './server/excelSync.js';

async function startServer() {
  const app = createApiApp();
  const PORT = 3000;

  // Initial sync from canonical sheet source on server boot
  try {
    console.log('[Server Startup] Synchronizing initial domain records from sheet source...');
    await Storage.syncListFromSheetSource();
  } catch (initErr) {
    console.warn('[Server Startup] Could not auto-sync sheet on boot:', initErr);
  }

  // Save current projects to Excel
  saveLatestExcelToDisk(Storage.getAllProjects());

  // Periodically pull from the Google Sheet so edits made directly in the sheet show up
  const SHEET_PULL_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(async () => {
    const { sheetUrl } = Storage.getGoogleSheetConfig();
    if (!sheetUrl || !sheetUrl.includes('spreadsheets/d/')) return;
    const result = await pullFromGoogleSheet(sheetUrl);
    if (!result.success) console.warn('[Sheet Auto-Pull] Failed:', result.message);
  }, SHEET_PULL_INTERVAL_MS);

  // ==========================================
  // Start Background IST Scheduler
  // ==========================================
  startScheduler();

  // ==========================================
  // Vite middleware setup
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CertPulse Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
