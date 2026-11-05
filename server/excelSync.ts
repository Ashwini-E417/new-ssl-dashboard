import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { ProjectRecord } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const EXCEL_FILE_PATH = path.join(DATA_DIR, 'RealEstate_Campaigns.xlsx');

export function generateExcelWorkbookBuffer(projects: ProjectRecord[]): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master with SSL details
  const masterData = projects.map((p) => ({
    'URL': p.url,
    'Lead Link': p.leadLink || '',
    'Server': p.server || 'nginx',
    'Campaign Status': p.campaignStatus || 'Active',
    'Region': p.region || '',
    'Image Optimize': p.imageOptimize || 'Pending',
    'RERA QR Status': p.reraQrStatus || 'Pending',
    'Comment': p.comment || '',
    'SSL Health': p.ssl?.status ? p.ssl.status.toUpperCase() : 'UNTESTED',
    'SSL Expiry Date': p.ssl?.validTo ? new Date(p.ssl.validTo).toLocaleDateString('en-GB') : '',
    'Days Remaining': p.ssl?.daysRemaining !== null && p.ssl?.daysRemaining !== undefined ? p.ssl.daysRemaining : '',
    'SSL Issuer': p.ssl?.issuer || '',
    'Last Checked': p.ssl?.lastCheckedAt ? new Date(p.ssl.lastCheckedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
  }));

  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  // Set column widths
  wsMaster['!cols'] = [
    { wch: 38 }, // URL
    { wch: 14 }, // Lead Link
    { wch: 10 }, // Server
    { wch: 16 }, // Campaign Status
    { wch: 16 }, // Region
    { wch: 16 }, // Image Optimize
    { wch: 16 }, // RERA QR Status
    { wch: 28 }, // Comment
    { wch: 14 }, // SSL Health
    { wch: 16 }, // SSL Expiry
    { wch: 16 }, // Days Remaining
    { wch: 28 }, // SSL Issuer
    { wch: 22 }, // Last Checked
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'All Projects & SSL');

  // Sheet 2: Clean 8 Columns matching original Google Sheet exactly
  const sheetData = projects.map((p) => ({
    'URL': p.url,
    'Lead Link': p.leadLink || '',
    'Server': p.server || 'nginx',
    'Campaign Status': p.campaignStatus || 'Active',
    'Region': p.region || '',
    'Image Optimize': p.imageOptimize || 'Pending',
    'RERA QR Status': p.reraQrStatus || 'Pending',
    'Comment': p.comment || '',
  }));

  const wsClean = XLSX.utils.json_to_sheet(sheetData);
  wsClean['!cols'] = [
    { wch: 38 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsClean, 'Google Sheet Format');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

export function saveLatestExcelToDisk(projects: ProjectRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const buffer = generateExcelWorkbookBuffer(projects);
    fs.writeFileSync(EXCEL_FILE_PATH, buffer);
  } catch (err: any) {
    console.error('Failed to save Excel file to disk:', err.message);
  }
}

export function parseExcelBuffer(buffer: Buffer): Array<{
  url: string;
  leadLink: string;
  server: string;
  campaignStatus: 'Active' | 'Paused' | 'Suspended' | 'Not Started';
  region: string;
  imageOptimize: string;
  reraQrStatus: 'Working' | 'Not Working' | 'No QR' | 'No RERA' | 'Pending';
  comment: string;
}> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return rows
    .filter((r) => r.URL || r.url || r['Website'] || r['website'] || r['Domain'])
    .map((r) => {
      const url = String(r.URL || r.url || r['Website'] || r['website'] || r['Domain'] || '').trim();
      const leadLink = String(r['Lead Link'] || r.leadLink || r['lead_link'] || '').trim();
      const server = String(r.Server || r.server || 'nginx').trim();
      
      let campaignStatus: 'Active' | 'Paused' | 'Suspended' | 'Not Started' = 'Active';
      const rawCamp = String(r['Campaign Status'] || r.campaignStatus || r['Status'] || r['status'] || '').trim().toLowerCase();
      if (rawCamp.includes('pause')) campaignStatus = 'Paused';
      else if (rawCamp.includes('suspend')) campaignStatus = 'Suspended';
      else if (rawCamp.includes('not start')) campaignStatus = 'Not Started';
      else if (rawCamp.includes('active')) campaignStatus = 'Active';

      const region = String(r.Region || r.region || 'General').trim();
      
      let imageOptimize = 'Pending';
      const rawImg = String(r['Image Optimize'] || r.imageOptimize || r['Image'] || '').trim();
      if (rawImg.toLowerCase().includes('done')) imageOptimize = 'Done';

      let reraQrStatus: 'Working' | 'Not Working' | 'No QR' | 'No RERA' | 'Pending' = 'Pending';
      const rawRera = String(r['RERA QR Status'] || r.reraQrStatus || r['RERA'] || r['rera'] || '').trim().toLowerCase();
      if (rawRera.includes('not work')) reraQrStatus = 'Not Working';
      else if (rawRera === 'working') reraQrStatus = 'Working';
      else if (rawRera.includes('no qr')) reraQrStatus = 'No QR';
      else if (rawRera.includes('no rera')) reraQrStatus = 'No RERA';
      else if (rawRera.includes('pending')) reraQrStatus = 'Pending';

      const comment = String(r.Comment || r.comment || '').trim();

      return {
        url,
        leadLink,
        server,
        campaignStatus,
        region,
        imageOptimize,
        reraQrStatus,
        comment,
      };
    });
}
