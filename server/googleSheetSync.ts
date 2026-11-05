import { Storage } from './storage.js';
import { ProjectRecord } from '../src/types.js';
import { saveLatestExcelToDisk } from './excelSync.js';

export function extractSheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export async function pullFromGoogleSheet(sheetUrlOrId: string): Promise<{
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  removed?: number;
}> {
  try {
    const sheetId = extractSheetId(sheetUrlOrId);
    if (!sheetId) {
      throw new Error('Invalid Google Sheet URL or ID');
    }

    Storage.updateGoogleSheetConfig({
      syncStatus: 'syncing',
      syncError: null,
    });

    // Read the tab the link points at (gid), defaulting to the first tab
    const gidMatch = sheetUrlOrId.match(/[#&?]gid=(\d+)/);
    const csvExportUrl =
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv` +
      (gidMatch ? `&gid=${gidMatch[1]}` : '');
    const response = await fetch(csvExportUrl, {
      headers: {
        'User-Agent': 'CertPulse-SSL-Monitor/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Google Sheet returned HTTP ${response.status}. Ensure "Anyone with the link can view" is enabled or use the Webhook Sync integration.`
      );
    }

    // A private sheet redirects to the Google sign-in page, which comes back as 200 HTML
    if ((response.headers.get('content-type') || '').includes('text/html')) {
      throw new Error(
        'Google returned a sign-in page instead of CSV. Set the sheet to "Anyone with the link can view".'
      );
    }

    const csvText = await response.text();
    const result = Storage.importFromCsv(csvText, { prune: true });

    // Also update disk Excel file
    saveLatestExcelToDisk(Storage.getAllProjects());

    Storage.updateGoogleSheetConfig({
      sheetUrl: sheetUrlOrId,
      sheetId,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'synced',
      syncError: null,
      totalSyncedRows: Storage.getAllProjects().length,
    });

    return {
      success: true,
      message: `Successfully synchronized from Google Sheet: ${result.imported} new, ${result.updated} updated, ${result.removed} removed rows.`,
      imported: result.imported,
      updated: result.updated,
      removed: result.removed,
    };
  } catch (err: any) {
    Storage.updateGoogleSheetConfig({
      syncStatus: 'error',
      syncError: err.message || 'Failed to sync with Google Sheet',
    });
    return {
      success: false,
      message: err.message || 'Sync failed',
    };
  }
}

export async function syncProjectToGoogleSheetWebhook(
  action: 'insert' | 'update' | 'delete' | 'bulk_update' | 'bulk_delete' | 'push_all',
  data: ProjectRecord | ProjectRecord[]
): Promise<{ success: boolean; message: string; configured: boolean }> {
  // Always update local Excel mirror on disk first
  saveLatestExcelToDisk(Storage.getAllProjects());

  const config = Storage.getGoogleSheetConfig();
  if (!config.webhookUrl || !config.webhookUrl.trim()) {
    return {
      success: false,
      message: 'Webhook URL not configured. Changes saved in dashboard and Excel file.',
      configured: false,
    };
  }

  try {
    const gidMatch = (config.sheetUrl || '').match(/[#&?]gid=(\d+)/);
    const payload = {
      action,
      // Tab to write to, so writes land on the same tab the pull reads from
      sheetGid: gidMatch ? Number(gidMatch[1]) : null,
      timestamp: new Date().toISOString(),
      source: 'CertPulse SSL Monitor',
      data,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      Storage.updateGoogleSheetConfig({
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        syncError: null,
      });
      return {
        success: true,
        message: 'Successfully updated Google Sheet.',
        configured: true,
      };
    } else {
      const errMsg = `Google Sheet webhook responded with HTTP ${response.status}`;
      Storage.updateGoogleSheetConfig({
        syncStatus: 'error',
        syncError: errMsg,
      });
      return {
        success: false,
        message: errMsg,
        configured: true,
      };
    }
  } catch (err: any) {
    const errMsg = `Google Sheet webhook error: ${err.message}`;
    Storage.updateGoogleSheetConfig({
      syncStatus: 'error',
      syncError: errMsg,
    });
    return {
      success: false,
      message: errMsg,
      configured: true,
    };
  }
}

export async function testGoogleSheetWebhook(webhookUrl: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Please provide a valid Webhook URL.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test_connection',
        timestamp: new Date().toISOString(),
        source: 'CertPulse SSL Monitor',
        data: { test: true },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      let resJson: any = {};
      try {
        resJson = await response.json();
      } catch {
        // text response is also okay
      }
      return {
        success: true,
        message: resJson.message || 'Webhook connection verified! Google Sheet is reachable.',
      };
    } else {
      return {
        success: false,
        message: `Webhook returned HTTP ${response.status}. Verify the deployment settings in Apps Script.`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Webhook: ${err.message}`,
    };
  }
}
