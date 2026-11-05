# Data Storage & Architecture Guide

This document explains where and how data is stored, persisted, synchronized, and backed up in **CertPulse - Real Estate SSL Monitor**, including the **Sheet-First synchronization flow** and **Automated 4-Day Expiration Email Alerts**.

---

## 1. Storage & Routine Check Architecture

The application operates on a **Sheet-Driven Model** where the domain list is kept in sync with your sheet, scanned routine-wise, and monitored for SSL expirations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Canonical Sheet Source / Google Sheet                │
│    `/server/data/sheet_source.csv` or Remote Google Sheet URL         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ (Auto-synced before EVERY check)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Routine SSL Check Engine                        │
│                                                                        │
│  1. Pulls latest domains, campaign statuses & attributes from sheet    │
│  2. Filters target domains: Checks ALL sites EXCEPT Suspended/Expired  │
│  3. Performs concurrent TLS handshakes (expiry, cipher, validity)      │
│  4. Detects certificates expiring in ≤ 4 days                          │
└────────────────────┬───────────────────────────────┬───────────────────┘
                     │                               │
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │   Automated Email Alert   │   │     Real-Time Mirrors     │
       │                           │   │                           │
       │   Dispatches email to:    │   │  • `server/data/          │
       │   `ashwini.poojary@       │   │     store.json`           │
       │    homesfy.in`            │   │  • `server/data/          │
       │                           │   │     RealEstate_           │
       │  (Website URL & Expiry)   │   │     Campaigns.xlsx`       │
       └───────────────────────────┘   └───────────────────────────┘
```

---

## 2. Exact File Locations on Disk

All application data resides inside the **`/server/data/`** directory:

| Storage File | Path | Description |
| :--- | :--- | :--- |
| **Canonical Sheet Source** | `/server/data/sheet_source.csv` | The master sheet export containing all 330+ campaign sites. Used as the primary source of truth before routine checks. |
| **Primary JSON Database** | `/server/data/store.json` | Stores active project records, TLS certificate metrics, check history timestamps, and scheduler run logs. |
| **Mirrored Excel Workbook** | `/server/data/RealEstate_Campaigns.xlsx` | Binary Excel workbook regenerated on every addition, edit, or status change. Downloadable anytime via the dashboard. |
| **Email Alert Settings** | `/server/data/email_settings.json` | Configuration for destination email (`ashwini.poojary@homesfy.in`), threshold days (`4`), and optional SMTP credentials. |
| **Email Alert History Logs** | `/server/data/email_logs.json` | Archive of all generated alert emails, timestamped site listings, and HTML previews. |

---

## 3. Routine SSL Check & Email Alert Rules

### A. Pre-Check Synchronization
- Before running any routine check (scheduled at **10:30 AM, 2:30 PM, and 6:00 PM IST**, or triggered manually), the system automatically executes:
  ```typescript
  await Storage.syncListFromSheetSource();
  ```
- If a Google Sheet URL is configured, it pulls live rows from Google Sheets. Otherwise, it syncs directly from `/server/data/sheet_source.csv`.

### B. Domain Filtering
- **Checked**: All campaign landing pages with status `Active`, `Paused`, or `Not Started`.
- **Excluded**: Campaign landing pages marked as `Suspended` or `Expired`.

### C. 4-Day Expiration Email Alert
- When certificates have `daysRemaining <= 4`:
  - An email alert is dispatched to **`ashwini.poojary@homesfy.in`**.
  - Includes: Website URL, SSL expiration date & time, days remaining urgency badge, campaign status, and certificate issuer.
  - The alert is also logged to `/server/data/email_logs.json` and visible in the in-app **Email Alerts** modal.

---

## 4. REST API Endpoints Reference

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/ssl/trigger-scheduled` | Triggers routine check: syncs sheet, scans non-suspended/expired sites, and emails sites expiring in ≤ 4 days |
| `POST` | `/api/sheets/sync-source` | Force syncs domains directly from sheet source |
| `GET` | `/api/ssl/expiring-4days` | Returns all sites with SSL expiring in the next 4 days |
| `POST` | `/api/email/send-alert` | Sends test or immediate alert email to `ashwini.poojary@homesfy.in` |
| `GET` | `/api/email/logs` | Fetches recent email alert logs and HTML previews |
| `GET` | `/api/email/settings` | Gets email recipient and SMTP settings |
| `POST` | `/api/email/settings` | Updates email recipient or SMTP credentials |
| `GET` | `/api/sheets/export-excel` | Downloads the generated `.xlsx` Excel spreadsheet |
| `GET` | `/api/sheets/export-csv` | Downloads the full dataset as `.csv` |
