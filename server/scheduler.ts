import { Storage } from './storage.js';
import { checkSSLCertificate } from './sslChecker.js';
import { ScheduledRunLog } from '../src/types.js';
import { sendExpiringSSLEmailAlert, getEmailAlertLogs, getEmailSettings } from './emailAlerts.js';
import { saveLatestExcelToDisk } from './excelSync.js';

interface ISTTime {
  hours: number;
  minutes: number;
  seconds: number;
  dateKey: string; // YYYY-MM-DD in IST
  formattedTime: string;
  formattedDate: string;
  rawDate: Date;
}

export function getISTTime(date = new Date()): ISTTime {
  // IST is UTC + 5h 30m = 330 minutes
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const istTime = new Date(utcTime + 330 * 60000);

  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const seconds = istTime.getSeconds();

  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const formattedTime = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm} IST`;
  const formattedDate = `${day}/${month}/${year}`;

  return {
    hours,
    minutes,
    seconds,
    dateKey,
    formattedTime,
    formattedDate,
    rawDate: istTime,
  };
}

// Scheduled check times in 24h format (hours, minutes, label)
export const SCHEDULED_SLOTS: Array<{ hours: number; minutes: number; label: '10:30 AM IST' | '2:30 PM IST' | '6:00 PM IST' }> = [
  { hours: 10, minutes: 30, label: '10:30 AM IST' },
  { hours: 14, minutes: 30, label: '2:30 PM IST' },
  { hours: 18, minutes: 0, label: '6:00 PM IST' },
];

let lastExecutedSlotKey: string | null = null;
let isCurrentlyRunning = false;
let checkProgress = {
  active: false,
  step: 'idle' as 'idle' | 'syncing_sheet' | 'checking_ssl' | 'sending_email',
  total: 0,
  current: 0,
  currentDomain: '',
};

/**
 * Executes a full routine SSL check:
 * 1. Syncs the latest domain list from the sheet first.
 * 2. Checks SSL of ALL sites except 'Suspended' and 'Expired' campaigns.
 * 3. Identifies sites expiring in the next 4 days.
 * 4. Automatically emails ashwini.poojary@homesfy.in with the website link & SSL expiration date.
 */
export async function runRoutineSSLCheck(
  slotLabel: '10:30 AM IST' | '2:30 PM IST' | '6:00 PM IST' | 'Manual Batch' = 'Manual Batch'
): Promise<ScheduledRunLog> {
  if (isCurrentlyRunning) {
    throw new Error('An SSL routine check batch is already in progress');
  }

  isCurrentlyRunning = true;
  const startTime = Date.now();

  try {
    // -------------------------------------------------------------
    // Step 1: Synchronize project list from sheet before checking
    // -------------------------------------------------------------
    checkProgress = {
      active: true,
      step: 'syncing_sheet',
      total: 0,
      current: 0,
      currentDomain: 'Synchronizing latest list from sheet...',
    };

    console.log(`[Routine SSL Check] Step 1: Synchronizing latest domain list from sheet before ${slotLabel}...`);
    try {
      const syncResult = await Storage.syncListFromSheetSource();
      console.log(`[Routine SSL Check] ${syncResult.message}`);
    } catch (sheetErr: any) {
      console.warn(`[Routine SSL Check] Sheet sync error before check:`, sheetErr.message);
    }

    // -------------------------------------------------------------
    // Step 2: Filter sites (check ALL sites EXCEPT Suspended and Expired)
    // -------------------------------------------------------------
    const allProjects = Storage.getAllProjects();
    const checkableProjects = allProjects.filter(
      (p) => p.campaignStatus !== 'Suspended' && p.campaignStatus !== 'Expired'
    );

    console.log(
      `[Routine SSL Check] Step 2: Found ${checkableProjects.length} checkable sites (${allProjects.length - checkableProjects.length} excluded as Suspended/Expired).`
    );

    checkProgress = {
      active: true,
      step: 'checking_ssl',
      total: checkableProjects.length,
      current: 0,
      currentDomain: '',
    };

    let validCount = 0;
    let expiringCount = 0;
    let failedCount = 0;

    // Concurrency controlled execution: 4 domains at a time
    const batchSize = 4;
    for (let i = 0; i < checkableProjects.length; i += batchSize) {
      const batch = checkableProjects.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (project) => {
          checkProgress.current++;
          checkProgress.currentDomain = project.url;

          try {
            const result = await checkSSLCertificate(project.url, 8000);
            Storage.updateProjectSSL(
              project.id,
              result,
              slotLabel === 'Manual Batch' ? 'manual' : 'scheduled'
            );

            if (result.status === 'valid') validCount++;
            else if (result.status === 'expiring_soon') expiringCount++;
            else failedCount++;
          } catch (err: any) {
            failedCount++;
            console.error(`[Routine SSL Check] Error checking SSL for ${project.url}:`, err);
          }
        })
      );
    }

    // -------------------------------------------------------------
    // Step 3: Check which sites have SSL expiring in next 4 days
    // -------------------------------------------------------------
    const updatedProjects = Storage.getAllProjects();
    const checkableUpdated = updatedProjects.filter(
      (p) => p.campaignStatus !== 'Suspended' && p.campaignStatus !== 'Expired'
    );

    const expiringSitesIn4Days = checkableUpdated
      .filter((p) => p.ssl && typeof p.ssl.daysRemaining === 'number' && p.ssl.daysRemaining <= 4)
      .map((p) => ({
        url: p.url,
        validTo: p.ssl.validTo,
        daysRemaining: p.ssl.daysRemaining,
        campaignStatus: p.campaignStatus,
        issuer: p.ssl.issuerOrg || p.ssl.issuer || 'Unknown',
      }));

    console.log(
      `[Routine SSL Check] Step 3: ${expiringSitesIn4Days.length} sites found with SSL expiring in <= 4 days.`
    );

    // -------------------------------------------------------------
    // Step 4: Send alert email to ashwini.poojary@homesfy.in
    // -------------------------------------------------------------
    checkProgress.step = 'sending_email';
    checkProgress.currentDomain = 'Preparing alert email to ashwini.poojary@homesfy.in...';

    let emailAlertStatus: 'sent' | 'no_expiring' | 'failed' | 'simulated' = 'no_expiring';

    if (expiringSitesIn4Days.length > 0) {
      try {
        // No explicit recipient: use the address saved in Email Settings
        const emailRes = await sendExpiringSSLEmailAlert(expiringSitesIn4Days);
        emailAlertStatus = emailRes.log.status;
        console.log(`[Routine SSL Check] Email alert result: ${emailRes.message}`);
      } catch (emailErr: any) {
        console.error(`[Routine SSL Check] Failed to send email alert:`, emailErr);
        emailAlertStatus = 'failed';
      }
    } else {
      console.log(`[Routine SSL Check] No sites expiring within 4 days. No alert email needed.`);
    }

    // Save updated Excel workbook to disk mirror
    saveLatestExcelToDisk(updatedProjects);

    const durationMs = Date.now() - startTime;
    const runLog: ScheduledRunLog = {
      id: `run-${Date.now()}`,
      slot: slotLabel,
      runAt: new Date().toISOString(),
      totalActive: checkableProjects.length,
      checkedCount: checkableProjects.length,
      validCount,
      expiringCount,
      failedCount,
      expiringIn4DaysCount: expiringSitesIn4Days.length,
      emailAlertStatus,
      durationMs,
    };

    Storage.addScheduledLog(runLog);
    console.log(
      `[Routine SSL Check] Completed ${slotLabel} routine check for ${checkableProjects.length} sites in ${durationMs}ms.`
    );

    return runLog;
  } finally {
    isCurrentlyRunning = false;
    checkProgress = {
      active: false,
      step: 'idle',
      total: 0,
      current: 0,
      currentDomain: '',
    };
  }
}

// Backwards compatibility alias
export const runActiveCampaignSSLCheck = runRoutineSSLCheck;

export function getSchedulerStatus() {
  const ist = getISTTime();
  const nowMs = ist.rawDate.getTime();

  // Find next slot
  let nextSlotTime: Date | null = null;
  let nextSlotLabel = '';

  for (const slot of SCHEDULED_SLOTS) {
    const slotDate = new Date(ist.rawDate);
    slotDate.setHours(slot.hours, slot.minutes, 0, 0);

    if (slotDate.getTime() > nowMs) {
      nextSlotTime = slotDate;
      nextSlotLabel = slot.label;
      break;
    }
  }

  // If past all slots today, next is 10:30 AM tomorrow
  if (!nextSlotTime) {
    const tomorrowSlot = new Date(ist.rawDate);
    tomorrowSlot.setDate(tomorrowSlot.getDate() + 1);
    tomorrowSlot.setHours(SCHEDULED_SLOTS[0].hours, SCHEDULED_SLOTS[0].minutes, 0, 0);
    nextSlotTime = tomorrowSlot;
    nextSlotLabel = SCHEDULED_SLOTS[0].label;
  }

  const secondsRemaining = Math.max(0, Math.floor((nextSlotTime.getTime() - nowMs) / 1000));
  const allProjects = Storage.getAllProjects();
  const checkableCount = allProjects.filter(
    (p) => p.campaignStatus !== 'Suspended' && p.campaignStatus !== 'Expired'
  ).length;
  const recentLogs = Storage.getScheduledLogs();
  const emailSettings = getEmailSettings();
  const recentEmailLogs = getEmailAlertLogs();

  const expiringIn4DaysCount = allProjects.filter(
    (p) =>
      p.campaignStatus !== 'Suspended' &&
      p.campaignStatus !== 'Expired' &&
      p.ssl &&
      typeof p.ssl.daysRemaining === 'number' &&
      p.ssl.daysRemaining <= 4
  ).length;

  return {
    currentIST: ist.formattedTime,
    currentISTDate: ist.formattedDate,
    nextSlotLabel,
    nextSlotRemainingSeconds: secondsRemaining,
    scheduledSlots: SCHEDULED_SLOTS.map((s) => s.label),
    isCheckingNow: isCurrentlyRunning,
    checkProgress,
    totalProjectsCount: allProjects.length,
    checkableCount,
    expiringIn4DaysCount,
    recipientEmail: emailSettings.recipientEmail || 'ashwini.poojary@homesfy.in',
    lastRun: recentLogs[0] || null,
    lastEmailLog: recentEmailLogs[0] || null,
  };
}

export function startScheduler() {
  console.log('[SSL Scheduler] Starting background IST monitor (10:30 AM, 2:30 PM, 6:00 PM IST)...');

  // Check every 25 seconds
  setInterval(async () => {
    try {
      const ist = getISTTime();

      for (const slot of SCHEDULED_SLOTS) {
        // Check if current IST matches slot hour and minute (within a 2-minute window)
        const isTargetTime =
          ist.hours === slot.hours &&
          ist.minutes >= slot.minutes &&
          ist.minutes < slot.minutes + 2;

        const slotKey = `${ist.dateKey}_${slot.label}`;

        if (isTargetTime && lastExecutedSlotKey !== slotKey && !isCurrentlyRunning) {
          lastExecutedSlotKey = slotKey;
          console.log(`[SSL Scheduler] Triggering automatic scheduled routine check for ${slot.label}...`);
          await runRoutineSSLCheck(slot.label);
        }
      }
    } catch (e) {
      console.error('[SSL Scheduler] Execution tick error:', e);
    }
  }, 25000);
}
