# CertPulse - Real Estate SSL Monitor & Campaign Dashboard

A high-performance SSL certificate monitoring dashboard for real estate campaigns with **Sheet-First synchronization**, automated IST routine checks, and **4-day expiration email alerts to `ashwini.poojary@homesfy.in`**.

---

## ⚡ Routine SSL Check & Email Alert Highlights

1. **Sheet Synchronization Before Every Check**:
   - The master list is synchronized from your sheet (`/server/data/sheet_source.csv` or connected Google Sheet) before every routine scan.
2. **Selective Domain Scan**:
   - Checks the SSL certificates of **all sites except `Suspended` and `Expired`**.
3. **Automated 4-Day Email Alert**:
   - Any website whose SSL certificate is expiring in the next 4 days is immediately emailed to **`ashwini.poojary@homesfy.in`** with:
     - Direct website link
     - Exact SSL expiration date & UTC/IST time
     - Days remaining urgency badge
     - Campaign status & certificate issuer

---

## 📁 Data Storage & Sheet Source

All files are maintained in `/server/data/`:
- **Master Sheet Source**: `/server/data/sheet_source.csv` (contains the complete list of 330+ sites)
- **Active State**: `/server/data/store.json`
- **Dynamic Excel**: `/server/data/RealEstate_Campaigns.xlsx` (downloadable anytime)
- **Email Alert Records**: `/server/data/email_logs.json`

👉 For full schema and workflow details, see **[DATA_STORAGE.md](./DATA_STORAGE.md)**.
