import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Check,
  Download,
  Upload,
  Code,
  Link2,
  Send,
  Zap,
} from 'lucide-react';
import { GoogleSheetConfig } from '../types';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetConfig | null;
  onSaveConfig: (updates: Partial<GoogleSheetConfig>) => Promise<void>;
  onPullSync: (sheetUrl?: string) => Promise<any>;
  onExportCsv: () => void;
  onExportExcel?: () => void;
  onImportCsv: (csvText: string) => Promise<any>;
  onRefreshData?: () => Promise<void>;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onPullSync,
  onExportCsv,
  onExportExcel,
  onImportCsv,
  onRefreshData,
}) => {
  const [sheetUrl, setSheetUrl] = useState(config?.sheetUrl || '');
  const [webhookUrl, setWebhookUrl] = useState(config?.webhookUrl || '');
  const [isPulling, setIsPulling] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingSource, setIsSyncingSource] = useState(false);

  if (!isOpen) return null;

  const handleSyncSource = async () => {
    setIsSyncingSource(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/sheets/sync-source', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message || 'Successfully synchronized list from sheet source!');
        if (onRefreshData) await onRefreshData();
      } else {
        setSyncError(data.message || 'Failed to sync from sheet source');
      }
    } catch (e: any) {
      setSyncError(e.message || 'Error communicating with server');
    } finally {
      setIsSyncingSource(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const res = await onPullSync(sheetUrl);
      if (res.success) {
        setSyncMessage(res.message || 'Successfully synchronized from Google Sheet');
        if (onRefreshData) await onRefreshData();
      } else {
        setSyncError(res.message || 'Sync failed');
      }
    } catch (e: any) {
      setSyncError(e.message || 'Error communicating with server');
    } finally {
      setIsPulling(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await onSaveConfig({
        sheetUrl: sheetUrl.trim(),
        webhookUrl: webhookUrl.trim(),
      });
      setSyncMessage('Google Sheet & Webhook configuration saved.');
    } catch (e: any) {
      setSyncError(e.message || 'Failed to save config');
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setSyncError('Please paste your Google Apps Script Web App Webhook URL first.');
      return;
    }
    setIsTestingWebhook(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      // Save it first so server has it
      await onSaveConfig({ webhookUrl: webhookUrl.trim() });
      const res = await fetch('/api/sheets/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✓ Webhook Test Passed: ${data.message}`);
      } else {
        setSyncError(`Webhook Test Failed: ${data.message}`);
      }
    } catch (e: any) {
      setSyncError(`Connection error: ${e.message}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handlePushAllToSheet = async () => {
    if (!webhookUrl.trim()) {
      setSyncError('Please configure your Google Apps Script Webhook URL below to push data.');
      return;
    }
    setIsPushingAll(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/sheets/push-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage('✓ All dashboard projects successfully pushed to your Google Sheet!');
      } else {
        setSyncError(`Push to Google Sheet failed: ${data.message}`);
      }
    } catch (e: any) {
      setSyncError(`Push error: ${e.message}`);
    } finally {
      setIsPushingAll(false);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setIsImporting(true);
    setSyncError(null);
    try {
      const res = await onImportCsv(csvText);
      if (res.success) {
        setSyncMessage(`Import complete: ${res.imported} new, ${res.updated} updated rows.`);
        setCsvText('');
        if (onRefreshData) await onRefreshData();
      } else {
        setSyncError('Failed to import CSV');
      }
    } catch (e: any) {
      setSyncError(e.message || 'Error processing CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const appsScriptCode = `/**
 * ------------------------------------------------------------------
 * CertPulse SSL Monitor - Google Sheets 2-Way Live Sync Script
 * ------------------------------------------------------------------
 * HOW TO SET UP (Takes 1 minute):
 * 1. Open your Google Sheet
 * 2. Click Extensions > Apps Script
 * 3. Delete any default code and paste this entire script
 * 4. Click "Deploy" > "New deployment"
 * 5. Click the gear icon (Select type) > Choose "Web app"
 * 6. Set Description: "CertPulse Live Sync"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL!
 * 9. Click "Deploy", allow permissions, and COPY the Web App URL!
 * 10. Paste the Web App URL into the Webhook URL field in CertPulse!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No payload" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheets()[0];
    if (payload.sheetGid !== null && payload.sheetGid !== undefined) {
      var tabs = spreadsheet.getSheets();
      for (var t = 0; t < tabs.length; t++) {
        if (tabs[t].getSheetId() === payload.sheetGid) sheet = tabs[t];
      }
    }

    // Quick health ping / test
    if (action === "test_connection" || action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Connected to sheet: " + sheet.getName(),
        totalRows: sheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Dynamic header lookup (handles any column order)
    var lastCol = Math.max(8, sheet.getLastColumn());
    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    var colMap = {
      url: 1,
      leadLink: 2,
      server: 3,
      campaignStatus: 4,
      region: 5,
      imageOptimize: 6,
      reraQrStatus: 7,
      comment: 8
    };

    for (var c = 0; c < headerRow.length; c++) {
      var h = (headerRow[c] || "").toString().toLowerCase().trim();
      if (h.indexOf("url") !== -1 || h.indexOf("website") !== -1 || h.indexOf("domain") !== -1) colMap.url = c + 1;
      else if (h.indexOf("lead") !== -1) colMap.leadLink = c + 1;
      else if (h.indexOf("server") !== -1) colMap.server = c + 1;
      else if (h.indexOf("campaign") !== -1 || h === "status") colMap.campaignStatus = c + 1;
      else if (h.indexOf("region") !== -1) colMap.region = c + 1;
      else if (h.indexOf("image") !== -1) colMap.imageOptimize = c + 1;
      else if (h.indexOf("rera") !== -1) colMap.reraQrStatus = c + 1;
      else if (h.indexOf("comment") !== -1) colMap.comment = c + 1;
    }

    function cleanUrl(u) {
      if (!u) return "";
      return u.toString().toLowerCase().trim()
        .replace(/^https?:\\/\\//, "")
        .replace(/\\/$/, "")
        .replace(/^www\\./, "");
    }

    var totalRows = sheet.getLastRow();
    var urlValues = totalRows > 1 ? sheet.getRange(2, colMap.url, totalRows - 1, 1).getValues() : [];

    function findRowIndex(targetUrl) {
      var cleanedTarget = cleanUrl(targetUrl);
      for (var r = 0; r < urlValues.length; r++) {
        if (cleanUrl(urlValues[r][0]) === cleanedTarget) {
          return r + 2;
        }
      }
      return -1;
    }

    function applyRowUpdate(targetRow, item) {
      if (colMap.url && item.url) sheet.getRange(targetRow, colMap.url).setValue(item.url);
      if (colMap.leadLink && item.leadLink !== undefined) sheet.getRange(targetRow, colMap.leadLink).setValue(item.leadLink);
      if (colMap.server && item.server !== undefined) sheet.getRange(targetRow, colMap.server).setValue(item.server);
      if (colMap.campaignStatus && item.campaignStatus !== undefined) sheet.getRange(targetRow, colMap.campaignStatus).setValue(item.campaignStatus);
      if (colMap.region && item.region !== undefined) sheet.getRange(targetRow, colMap.region).setValue(item.region);
      if (colMap.imageOptimize && item.imageOptimize !== undefined) sheet.getRange(targetRow, colMap.imageOptimize).setValue(item.imageOptimize);
      if (colMap.reraQrStatus && item.reraQrStatus !== undefined) sheet.getRange(targetRow, colMap.reraQrStatus).setValue(item.reraQrStatus);
      if (colMap.comment && item.comment !== undefined) sheet.getRange(targetRow, colMap.comment).setValue(item.comment);
    }

    function insertNewRow(item) {
      var newRow = [];
      var maxC = Math.max(8, sheet.getLastColumn());
      for (var c = 1; c <= maxC; c++) {
        if (c === colMap.url) newRow.push(item.url || "");
        else if (c === colMap.leadLink) newRow.push(item.leadLink || "");
        else if (c === colMap.server) newRow.push(item.server || "nginx");
        else if (c === colMap.campaignStatus) newRow.push(item.campaignStatus || "Active");
        else if (c === colMap.region) newRow.push(item.region || "");
        else if (c === colMap.imageOptimize) newRow.push(item.imageOptimize || "Pending");
        else if (c === colMap.reraQrStatus) newRow.push(item.reraQrStatus || "Pending");
        else if (c === colMap.comment) newRow.push(item.comment || "");
        else newRow.push("");
      }
      sheet.appendRow(newRow);
    }

    if (action === "insert" || action === "update") {
      var rowIdx = findRowIndex(data.url);
      if (rowIdx !== -1) {
        applyRowUpdate(rowIdx, data);
      } else {
        insertNewRow(data);
      }
    } else if (action === "bulk_update" || action === "push_all") {
      var items = Array.isArray(data) ? data : [data];
      for (var i = 0; i < items.length; i++) {
        var itm = items[i];
        var rIdx = findRowIndex(itm.url);
        if (rIdx !== -1) {
          applyRowUpdate(rIdx, itm);
        } else {
          insertNewRow(itm);
        }
      }
    } else if (action === "delete") {
      var delRow = findRowIndex(data.url);
      if (delRow !== -1) {
        sheet.deleteRow(delRow);
      }
    } else if (action === "bulk_delete") {
      var delItems = Array.isArray(data) ? data : [data];
      var delRows = [];
      for (var d = 0; d < delItems.length; d++) {
        var dr = findRowIndex(delItems[d].url);
        if (dr !== -1 && delRows.indexOf(dr) === -1) delRows.push(dr);
      }
      // Delete bottom-up so earlier deletions don't shift the remaining row numbers
      delRows.sort(function (a, b) { return b - a; });
      for (var k = 0; k < delRows.length; k++) {
        sheet.deleteRow(delRows[k]);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Excel &amp; Google Sheets 2-Way Sync
              </h2>
              <p className="text-xs text-slate-500">
                Live sync changes between dashboard, Excel (.xlsx), and Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {syncMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {syncError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* Section 1: Live Excel (.xlsx) Export */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="font-bold text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Live Excel Spreadsheet (.xlsx)
                </span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/90 mt-0.5">
                  Every new project and status change (Campaign, RERA QR, Image Optimize) is immediately saved to the server Excel workbook.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSyncSource}
                  disabled={isSyncingSource}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-all text-xs disabled:opacity-50"
                  title="Reloads all domains & campaign statuses from your sheet source file"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSource ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSource ? 'Syncing...' : 'Sync from Sheet Source'}</span>
                </button>
                {onExportExcel && (
                  <button
                    onClick={onExportExcel}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                )}
                <button
                  onClick={onExportCsv}
                  className="inline-flex items-center space-x-1 px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Live 2-Way Sync Webhook (Push to Google Sheet) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Automatic Google Sheet 2-Way Sync (Webhook)
                </span>
                <span className="text-[11px] text-slate-500">
                  Allows the dashboard to write edits, new projects, and status changes directly into your Google Sheet.
                </span>
              </div>
              <button
                onClick={copyScript}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-800 dark:text-slate-200"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Code className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied Script!' : 'Copy Apps Script'}</span>
              </button>
            </div>

            {/* Steps Guide */}
            <div className="bg-white dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">How to connect in 1 minute:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
                <li>Click <strong>Copy Apps Script</strong> above.</li>
                <li>In your Google Sheet, open <strong>Extensions &gt; Apps Script</strong> and paste the code.</li>
                <li>Click <strong>Deploy &gt; New deployment</strong>, select <strong>Web app</strong>, set &ldquo;Who has access&rdquo; to <strong>Anyone</strong>, click Deploy.</li>
                <li>Copy the generated Web App URL and paste it below:</li>
              </ol>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Google Apps Script Webhook URL:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium text-slate-800 dark:text-slate-200 transition-colors"
                >
                  Save URL
                </button>
              </div>
            </div>

            {/* Test Connection and Push All Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={isTestingWebhook || !webhookUrl.trim()}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                <span>{isTestingWebhook ? 'Testing...' : 'Test Webhook Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handlePushAllToSheet}
                disabled={isPushingAll || !webhookUrl.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50"
                title="Send all projects and their latest statuses to the Google Sheet"
              >
                <Send className={`w-3.5 h-3.5 ${isPushingAll ? 'animate-bounce' : ''}`} />
                <span>{isPushingAll ? 'Pushing Data...' : 'Push All Projects to Sheet Now'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Google Sheet Pull Connection */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-500" />
                Google Sheet Read / Pull URL
              </span>
              <span className="text-[11px] text-slate-400">
                Last pulled: {config?.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleTimeString() : 'Never'}
              </span>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium text-slate-800 dark:text-slate-200 transition-colors"
              >
                Save
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Rows tracked: <strong>{config?.totalSyncedRows || 0}</strong> projects
              </span>
              <button
                type="button"
                onClick={handlePull}
                disabled={isPulling}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                <span>{isPulling ? 'Syncing...' : 'Pull / Reload from Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Section 4: CSV Import */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              Quick CSV Import
            </span>
            <p className="text-[11px] text-slate-500">
              Paste CSV text with column headers to bulk import or update:
            </p>
            <textarea
              rows={2}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="URL,lead link,server,Campaign Status,Region,Image optimize,Rera Qr status,comment..."
              className="w-full p-2 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
            />
            <button
              onClick={handleImport}
              disabled={isImporting || !csvText.trim()}
              className="flex items-center justify-center space-x-1.5 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isImporting ? 'Importing...' : 'Parse & Import CSV'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
