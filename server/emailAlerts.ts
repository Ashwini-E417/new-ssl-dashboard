import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { EmailAlertLog, EmailSettings, ProjectRecord } from '../src/types.js';
import { getISTTime } from './scheduler.js';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'email_settings.json');
const LOGS_PATH = path.join(DATA_DIR, 'email_logs.json');

const DEFAULT_SETTINGS: EmailSettings = {
  recipientEmail: 'ashwini.poojary@homesfy.in',
  alertThresholdDays: 4,
  senderEmail: 'certpulse-alerts@sslmonitor.app',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  smtpUser: process.env.SMTP_USER || process.env.GMAIL_USER || '',
  smtpPass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '',
  smtpSecure: false,
  enabled: true,
};

// In serverless mode settings/logs live in memory and are hydrated/flushed by server/persistence.ts.
// Only user-saved overrides are stored, so env-provided SMTP credentials are never written to the database.
let externalEmailState: { settings: Partial<EmailSettings>; logs: EmailAlertLog[] } | null = null;

export function setEmailState(state: { settings: Partial<EmailSettings>; logs: EmailAlertLog[] }) {
  externalEmailState = { settings: { ...(state.settings || {}) }, logs: state.logs || [] };
}

export function getEmailState() {
  return externalEmailState;
}

/** Reads the bundled email settings/logs (used to seed the hosted database on first run). */
export function readBundledEmailState(): { settings: Partial<EmailSettings>; logs: EmailAlertLog[] } {
  let settings: Partial<EmailSettings> = {};
  let logs: EmailAlertLog[] = [];
  try {
    if (fs.existsSync(SETTINGS_PATH)) settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {}
  try {
    if (fs.existsSync(LOGS_PATH)) logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf-8')) || [];
  } catch {}
  return { settings, logs };
}

function ensureEmailFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
  if (!fs.existsSync(LOGS_PATH)) {
    fs.writeFileSync(LOGS_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getEmailSettings(): EmailSettings {
  if (externalEmailState) {
    // Empty saved values fall back to defaults (incl. SMTP_* environment variables)
    const overrides = Object.fromEntries(
      Object.entries(externalEmailState.settings).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    return { ...DEFAULT_SETTINGS, ...overrides } as EmailSettings;
  }
  ensureEmailFiles();
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function updateEmailSettings(updates: Partial<EmailSettings>): EmailSettings {
  if (externalEmailState) {
    externalEmailState.settings = { ...externalEmailState.settings, ...updates };
    return getEmailSettings();
  }
  ensureEmailFiles();
  const current = getEmailSettings();
  const updated = { ...current, ...updates };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function getEmailAlertLogs(): EmailAlertLog[] {
  if (externalEmailState) return externalEmailState.logs;
  ensureEmailFiles();
  try {
    const raw = fs.readFileSync(LOGS_PATH, 'utf-8');
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

export function saveEmailAlertLog(log: EmailAlertLog) {
  if (externalEmailState) {
    externalEmailState.logs = [log, ...externalEmailState.logs].slice(0, 50);
    return;
  }
  ensureEmailFiles();
  const logs = getEmailAlertLogs();
  const updated = [log, ...logs].slice(0, 50); // keep recent 50 logs
  fs.writeFileSync(LOGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
}

export function buildEmailHtml(
  recipient: string,
  expiringSites: Array<{
    url: string;
    validTo: string | null;
    daysRemaining: number | null;
    campaignStatus: string;
    issuer: string | null;
  }>,
  istFormatted: string
): { subject: string; html: string; text: string } {
  const count = expiringSites.length;
  const subject = `⚠️ [Urgent SSL Alert] ${count} Site${count === 1 ? '' : 's'} Expiring in Next 4 Days - CertPulse`;

  const rowsHtml = expiringSites
    .map((site, index) => {
      const days = site.daysRemaining ?? 0;
      let badgeColor = '#ef4444'; // red
      let badgeText = `${days} Days Remaining`;

      if (days <= 0) {
        badgeColor = '#dc2626';
        badgeText = 'EXPIRED';
      } else if (days === 1) {
        badgeColor = '#ea580c';
        badgeText = '1 Day Remaining (Urgent)';
      } else if (days <= 4) {
        badgeColor = '#f59e0b';
        badgeText = `${days} Days Remaining`;
      }

      const formattedExpiry = site.validTo
        ? new Date(site.validTo).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' UTC'
        : 'Unknown / Error';

      const fullUrl = site.url.startsWith('http') ? site.url : `https://${site.url}`;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 12px 14px; font-weight: 600; font-family: monospace; font-size: 14px;">
            <a href="${fullUrl}" target="_blank" style="color: #0284c7; text-decoration: none;">${site.url}</a>
          </td>
          <td style="padding: 12px 14px; font-size: 13px; color: #334155;">
            <strong>${formattedExpiry}</strong>
          </td>
          <td style="padding: 12px 14px;">
            <span style="background-color: ${badgeColor}; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; display: inline-block;">
              ${badgeText}
            </span>
          </td>
          <td style="padding: 12px 14px; font-size: 13px; color: #475569;">
            <span style="padding: 2px 8px; border-radius: 4px; background: #e2e8f0; font-size: 11px; font-weight: 600;">${site.campaignStatus}</span>
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #64748b;">
            ${site.issuer || 'Unknown'}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>CertPulse SSL Alert</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 760px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; color: #ffffff;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">CertPulse • Automated Routine SSL Check</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">SSL Expiration Alert: Next 4 Days</h1>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">
                Routine scan executed at <strong>${istFormatted}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                  Attention Required: ${count} real estate campaign website${count === 1 ? ' has an SSL certificate' : 's have SSL certificates'} expiring within the next 4 days.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #b91c1c;">
                  All sites except Suspended and Expired campaigns were checked. Please renew these certificates immediately to avoid downtime and browser warnings.
                </p>
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 13px; text-align: left; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th style="padding: 12px 14px;">Website URL</th>
                    <th style="padding: 12px 14px;">Expiration Date</th>
                    <th style="padding: 12px 14px;">Urgency</th>
                    <th style="padding: 12px 14px;">Status</th>
                    <th style="padding: 12px 14px;">Issuer</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
                <p style="margin: 0;">This automated alert was dispatched to <strong>${recipient}</strong> according to your routine SSL check schedule.</p>
                <p style="margin: 4px 0 0 0;">CertPulse Real Estate SSL Monitor • Synchronized with your latest sheet</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textLines = [
    `URGENT SSL EXPIRATION ALERT (${count} Sites Expiring in Next 4 Days)`,
    `Routine check run at: ${istFormatted}`,
    `Recipient: ${recipient}`,
    '--------------------------------------------------',
    ...expiringSites.map(
      (s) =>
        `- ${s.url} | Expiry: ${s.validTo || 'Unknown'} | Days Left: ${s.daysRemaining ?? 'N/A'} | Campaign: ${s.campaignStatus}`
    ),
    '--------------------------------------------------',
    'Please renew certificates immediately to prevent domain downtime.',
  ];

  return {
    subject,
    html,
    text: textLines.join('\n'),
  };
}

export async function sendExpiringSSLEmailAlert(
  expiringSites: Array<{
    url: string;
    validTo: string | null;
    daysRemaining: number | null;
    campaignStatus: string;
    issuer: string | null;
  }>,
  customRecipient?: string
): Promise<{ success: boolean; message: string; log: EmailAlertLog }> {
  const settings = getEmailSettings();
  const recipient = (customRecipient || settings.recipientEmail || 'ashwini.poojary@homesfy.in').trim();
  const ist = getISTTime();

  if (expiringSites.length === 0) {
    const emptyLog: EmailAlertLog = {
      id: `alert-${Date.now()}`,
      recipient,
      sentAt: new Date().toISOString(),
      subject: 'Routine SSL Check Completed (No Expiring Sites)',
      expiringSitesCount: 0,
      sites: [],
      status: 'sent',
      error: null,
      htmlPreview: '',
    };
    return {
      success: true,
      message: 'No sites expiring in the next 4 days. No alert email needed.',
      log: emptyLog,
    };
  }

  const { subject, html, text } = buildEmailHtml(recipient, expiringSites, ist.formattedTime);

  const logEntry: EmailAlertLog = {
    id: `alert-${Date.now()}`,
    recipient,
    sentAt: new Date().toISOString(),
    subject,
    expiringSitesCount: expiringSites.length,
    sites: expiringSites as any,
    status: 'simulated',
    error: null,
    htmlPreview: html,
  };

  // Check if real SMTP credentials are provided
  const hasSmtp =
    Boolean(settings.smtpHost && settings.smtpHost.trim()) ||
    Boolean(settings.smtpUser && settings.smtpPass);

  if (hasSmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost || 'smtp.gmail.com',
        port: settings.smtpPort || 587,
        secure: settings.smtpSecure || false,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${settings.senderEmail || 'CertPulse SSL Monitor'}" <${settings.smtpUser || settings.senderEmail}>`,
        to: recipient,
        subject,
        text,
        html,
      });

      logEntry.status = 'sent';
      saveEmailAlertLog(logEntry);
      console.log(`[Email Alert] Successfully sent alert email to ${recipient} for ${expiringSites.length} expiring sites.`);
      return {
        success: true,
        message: `Email alert successfully sent to ${recipient} for ${expiringSites.length} expiring site(s).`,
        log: logEntry,
      };
    } catch (err: any) {
      console.error(`[Email Alert] SMTP send failed:`, err);
      logEntry.status = 'failed';
      logEntry.error = err.message || 'SMTP transmission error';
      saveEmailAlertLog(logEntry);
      return {
        success: false,
        message: `SMTP error sending to ${recipient}: ${err.message}. Email logged in dashboard.`,
        log: logEntry,
      };
    }
  } else {
    // Simulated / Logged delivery: Records the exact alert, displays in UI, and logs to console
    logEntry.status = 'simulated';
    saveEmailAlertLog(logEntry);
    console.log(
      `[Email Alert Prepared] Recipient: ${recipient} | ${expiringSites.length} site(s) expiring within 4 days.\nSubject: ${subject}\nTo enable live SMTP delivery, enter SMTP / Gmail App Password in Email Settings.`
    );
    return {
      success: true,
      message: `Alert generated for ${recipient} with ${expiringSites.length} expiring site(s). Logged to Email Alerts History.`,
      log: logEntry,
    };
  }
}
