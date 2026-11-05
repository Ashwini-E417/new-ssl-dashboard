import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Storage } from './server/storage.js';
import { checkSSLCertificate } from './server/sslChecker.js';
import {
  startScheduler,
  getSchedulerStatus,
  runRoutineSSLCheck,
} from './server/scheduler.js';
import {
  pullFromGoogleSheet,
  syncProjectToGoogleSheetWebhook,
  testGoogleSheetWebhook,
} from './server/googleSheetSync.js';
import {
  generateExcelWorkbookBuffer,
  saveLatestExcelToDisk,
  parseExcelBuffer,
} from './server/excelSync.js';
import {
  getEmailSettings,
  updateEmailSettings,
  getEmailAlertLogs,
  sendExpiringSSLEmailAlert,
} from './server/emailAlerts.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================
  // API Routes
  // ==========================================

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Dashboard Overview Stats
  app.get('/api/stats', (_req, res) => {
    const stats = Storage.getDashboardStats();
    res.json(stats);
  });

  // Get all projects with optional query params
  app.get('/api/projects', (req, res) => {
    const projects = Storage.getAllProjects();
    res.json(projects);
  });

  // Get single project
  app.get('/api/projects/:id', (req, res) => {
    const project = Storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  });

  // Create new project (Add New Project)
  app.post('/api/projects', async (req, res) => {
    try {
      const {
        url,
        leadLink,
        server,
        campaignStatus,
        region,
        imageOptimize,
        reraQrStatus,
        comment,
        checkSslNow,
      } = req.body;

      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return res.status(400).json({ error: 'Valid URL / Domain is required' });
      }

      const cleanUrl = url.trim();

      const newProject = Storage.createProject({
        url: cleanUrl,
        leadLink: leadLink || '',
        server: server || 'nginx',
        campaignStatus: campaignStatus || 'Active',
        region: region || 'General',
        imageOptimize: imageOptimize || 'Pending',
        reraQrStatus: reraQrStatus || 'Pending',
        comment: comment || '',
      });

      // Synchronize to Google Sheet webhook and update local Excel mirror
      const syncResult = await syncProjectToGoogleSheetWebhook('insert', newProject);

      // Optionally check SSL immediately in background or wait for it
      if (checkSslNow) {
        try {
          const sslResult = await checkSSLCertificate(cleanUrl, 8000);
          const updated = Storage.updateProjectSSL(newProject.id, sslResult, 'manual');
          if (updated) saveLatestExcelToDisk(Storage.getAllProjects());
          return res.status(201).json({ ...(updated || newProject), syncResult });
        } catch (e) {
          // If check fails, return newly created project anyway
          return res.status(201).json({ ...newProject, syncResult });
        }
      }

      res.status(201).json({ ...newProject, syncResult });
    } catch (err: any) {
      console.error('Failed to create project:', err);
      res.status(500).json({ error: err.message || 'Failed to create project' });
    }
  });

  // Update single project
  app.put('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow modifying ID
      delete updates.id;
      delete updates.createdAt;

      const updated = Storage.updateProject(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Sync back to Google Sheet webhook and update local Excel mirror
      const syncResult = await syncProjectToGoogleSheetWebhook('update', updated);

      res.json({ ...updated, syncResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update project' });
    }
  });

  // Delete single project
  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const project = Storage.getProjectById(id);
      const deleted = Storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project) {
        await syncProjectToGoogleSheetWebhook('delete', project);
      }

      res.json({ success: true, message: 'Project deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete project' });
    }
  });

  // Bulk update projects
  app.post('/api/projects/bulk-update', async (req, res) => {
    try {
      const { ids, updates } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      delete updates.id;
      delete updates.createdAt;
      delete updates.ssl;
      delete updates.history;

      const updatedCount = Storage.bulkUpdate(ids, updates);
      const updatedProjects = ids
        .map((id: string) => Storage.getProjectById(id))
        .filter(Boolean) as any[];
      const syncResult = await syncProjectToGoogleSheetWebhook('bulk_update', updatedProjects);

      res.json({ success: true, updatedCount, syncResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to bulk update' });
    }
  });

  // Bulk delete projects
  app.post('/api/projects/bulk-delete', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      const projectsToDelete = ids
        .map((id: string) => Storage.getProjectById(id))
        .filter(Boolean) as any[];
      const deletedCount = Storage.bulkDelete(ids);
      // Remove the rows from the Google Sheet too, otherwise the next pull re-adds them
      const syncResult = await syncProjectToGoogleSheetWebhook('bulk_delete', projectsToDelete);
      res.json({ success: true, deletedCount, syncResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to bulk delete' });
    }
  });

  // Real-time server-side SSL check for a single project
  app.post('/api/ssl/check/:id', async (req, res) => {
    try {
      const project = Storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const result = await checkSSLCertificate(project.url, 9000);
      const updated = Storage.updateProjectSSL(project.id, result, 'manual');

      res.json({
        success: true,
        ssl: result,
        project: updated,
      });
    } catch (err: any) {
      console.error('SSL check error:', err);
      res.status(500).json({ error: err.message || 'SSL inspection failed' });
    }
  });

  // Bulk SSL check for selected IDs or active campaigns
  app.post('/api/ssl/check-batch', async (req, res) => {
    try {
      const { ids, target } = req.body;
      const allProjects = Storage.getAllProjects();

      let targetProjects = allProjects;
      if (Array.isArray(ids) && ids.length > 0) {
        targetProjects = allProjects.filter((p) => ids.includes(p.id));
      } else if (target === 'active') {
        targetProjects = allProjects.filter((p) => p.campaignStatus === 'Active');
      }

      // Check in concurrent batches of 4
      const results: Array<{ id: string; url: string; status: string; daysRemaining: number | null }> = [];
      const batchSize = 4;

      for (let i = 0; i < targetProjects.length; i += batchSize) {
        const chunk = targetProjects.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async (project) => {
            try {
              const res = await checkSSLCertificate(project.url, 7500);
              Storage.updateProjectSSL(project.id, res, 'bulk');
              results.push({
                id: project.id,
                url: project.url,
                status: res.status,
                daysRemaining: res.daysRemaining,
              });
            } catch (e: any) {
              results.push({
                id: project.id,
                url: project.url,
                status: 'invalid',
                daysRemaining: null,
              });
            }
          })
        );
      }

      res.json({
        success: true,
        checkedCount: results.length,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Batch SSL check failed' });
    }
  });

  // Scheduler status & IST clock
  app.get('/api/ssl/scheduler-status', (_req, res) => {
    const status = getSchedulerStatus();
    res.json(status);
  });

  // Trigger manual run of the routine check (syncs sheet first, checks all sites except Suspended/Expired, emails expiring in 4 days)
  app.post('/api/ssl/trigger-scheduled', async (_req, res) => {
    try {
      const log = await runRoutineSSLCheck('Manual Batch');
      res.json({ success: true, log });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Routine check failed' });
    }
  });

  // Direct sync from Sheet Source (Google Sheet URL or sheet_source.csv)
  app.post('/api/sheets/sync-source', async (_req, res) => {
    try {
      const result = await Storage.syncListFromSheetSource();
      saveLatestExcelToDisk(Storage.getAllProjects());
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Get sites expiring within 4 days (for alert review)
  app.get('/api/ssl/expiring-4days', (_req, res) => {
    const all = Storage.getAllProjects();
    const expiring = all
      .filter(
        (p) =>
          p.campaignStatus !== 'Suspended' &&
          p.campaignStatus !== 'Expired' &&
          p.ssl &&
          typeof p.ssl.daysRemaining === 'number' &&
          p.ssl.daysRemaining <= 4
      )
      .map((p) => ({
        id: p.id,
        url: p.url,
        validTo: p.ssl.validTo,
        daysRemaining: p.ssl.daysRemaining,
        campaignStatus: p.campaignStatus,
        region: p.region,
        issuer: p.ssl.issuerOrg || p.ssl.issuer || 'Unknown',
        error: p.ssl.error,
      }));

    res.json({
      count: expiring.length,
      recipient: getEmailSettings().recipientEmail || 'ashwini.poojary@homesfy.in',
      sites: expiring,
    });
  });

  // Email alert configuration
  app.get('/api/email/settings', (_req, res) => {
    const settings = getEmailSettings();
    // Mask password for security
    res.json({
      ...settings,
      smtpPass: settings.smtpPass ? '••••••••' : '',
      isSmtpConfigured: Boolean(settings.smtpUser && settings.smtpPass),
    });
  });

  app.post('/api/email/settings', (req, res) => {
    const updates = req.body;
    // Don't overwrite password with masked dots
    if (updates.smtpPass === '••••••••') {
      delete updates.smtpPass;
    }
    const updated = updateEmailSettings(updates);
    res.json({
      ...updated,
      smtpPass: updated.smtpPass ? '••••••••' : '',
      isSmtpConfigured: Boolean(updated.smtpUser && updated.smtpPass),
    });
  });

  // Email alert history logs
  app.get('/api/email/logs', (_req, res) => {
    const logs = getEmailAlertLogs();
    res.json(logs);
  });

  // Send test or immediate email alert to ashwini.poojary@homesfy.in
  app.post('/api/email/send-alert', async (req, res) => {
    try {
      const { recipientEmail, forceSendAllExpiring } = req.body;
      const targetEmail = recipientEmail || getEmailSettings().recipientEmail || 'ashwini.poojary@homesfy.in';

      const all = Storage.getAllProjects();
      let expiring = all
        .filter(
          (p) =>
            p.campaignStatus !== 'Suspended' &&
            p.campaignStatus !== 'Expired' &&
            p.ssl &&
            typeof p.ssl.daysRemaining === 'number' &&
            p.ssl.daysRemaining <= 4
        )
        .map((p) => ({
          url: p.url,
          validTo: p.ssl.validTo,
          daysRemaining: p.ssl.daysRemaining,
          campaignStatus: p.campaignStatus,
          issuer: p.ssl.issuerOrg || p.ssl.issuer || 'Unknown',
        }));

      // If no sites currently <= 4 days and force test requested, synthesize a demo item
      if (expiring.length === 0 && forceSendAllExpiring) {
        expiring = [
          {
            url: 'demo-realestate-campaign.com',
            validTo: new Date(Date.now() + 2 * 86400000).toISOString(),
            daysRemaining: 2,
            campaignStatus: 'Active',
            issuer: "Let's Encrypt Authority R3",
          },
        ];
      }

      const result = await sendExpiringSSLEmailAlert(expiring, targetEmail);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Google Sheet Configuration
  app.get('/api/sheets/config', (_req, res) => {
    const config = Storage.getGoogleSheetConfig();
    res.json(config);
  });

  app.post('/api/sheets/config', (req, res) => {
    const updated = Storage.updateGoogleSheetConfig(req.body);
    res.json(updated);
  });

  // Pull / sync from Google Sheet
  app.post('/api/sheets/sync-pull', async (req, res) => {
    const { sheetUrl } = req.body;
    const config = Storage.getGoogleSheetConfig();
    const urlToUse = sheetUrl || config.sheetUrl;

    if (!urlToUse) {
      return res.status(400).json({ error: 'Google Sheet URL is required' });
    }

    const outcome = await pullFromGoogleSheet(urlToUse);
    res.json(outcome);
  });

  // Export CSV
  app.get('/api/sheets/export-csv', (_req, res) => {
    const csvData = Storage.exportAsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ssl_campaign_monitor.csv"');
    res.send(csvData);
  });

  // Export Excel (.xlsx)
  app.get('/api/sheets/export-excel', (_req, res) => {
    try {
      const projects = Storage.getAllProjects();
      const buffer = generateExcelWorkbookBuffer(projects);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="CertPulse_RealEstate_Campaigns.xlsx"'
      );
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to export Excel file' });
    }
  });

  // Import CSV
  app.post('/api/sheets/import-csv', (req, res) => {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'csvContent string is required' });
    }

    const result = Storage.importFromCsv(csvContent);
    saveLatestExcelToDisk(Storage.getAllProjects());
    res.json({ success: true, ...result });
  });

  // Test Webhook connection
  app.post('/api/sheets/test-webhook', async (req, res) => {
    const { webhookUrl } = req.body;
    const config = Storage.getGoogleSheetConfig();
    const url = webhookUrl || config.webhookUrl;
    const result = await testGoogleSheetWebhook(url);
    res.json(result);
  });

  // Push all projects to Google Sheet webhook
  app.post('/api/sheets/push-all', async (_req, res) => {
    try {
      const projects = Storage.getAllProjects();
      const result = await syncProjectToGoogleSheetWebhook('push_all', projects);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

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
