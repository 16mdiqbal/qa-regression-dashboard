# QA Regression Dashboard

Interactive analytics dashboard that reads QA test results from Google Sheets and renders charts with dynamic filtering.

## Stack

- **React 19 + TypeScript** — Vite
- **Tailwind CSS v4** — styling
- **Recharts** — charts
- **Google Sheets API v4** — data source (OAuth 2.0 or API Key)

## Getting Started

```bash
npm install
npm run dev
```

Without credentials the dashboard runs on mock data automatically.

## Connecting to Google Sheets

### Option A — API Key (read-only, simplest)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → Create Credentials → API Key**
2. Restrict the key to the **Google Sheets API**
3. Share your spreadsheet with **Anyone with the link (Viewer)**
4. Create `.env.local`:

```
VITE_GOOGLE_SHEETS_API_KEY=your_api_key
VITE_SPREADSHEET_ID=your_spreadsheet_id
```

### Option B — OAuth 2.0 (works with private spreadsheets)

**One-time setup in Google Cloud Console:**

1. Enable the **Google Sheets API** for your project
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add `https://developers.google.com/oauthplayground` to **Authorized redirect URIs**
3. Note your **Client ID** and **Client Secret**

**Get a Refresh Token via OAuth Playground:**

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (top right) → check **Use your own OAuth credentials** → enter your Client ID and Secret
3. In Step 1, select scope: `https://www.googleapis.com/auth/spreadsheets.readonly` → **Authorize APIs**
4. In Step 2, click **Exchange authorization code for tokens** → copy the **Refresh token**

**Enter credentials in the app:**

Open the Settings gear → paste your **Client ID**, **Client Secret**, **Refresh Token**, and the **Spreadsheet URL**. Set a PIN — credentials are stored AES-GCM encrypted (PBKDF2-derived key) in `localStorage` and cached in `sessionStorage` for 24 hours so you're only prompted for the PIN once per day.

## Sheet Format

Each sheet tab must follow this column layout:

| A | B | C | D | E (last) |
|---|---|---|---|---|
| Date (`D-M-YYYY`) | Folder Name | ... | ... | Metric value |

The Regression Rate sheet uses columns A–E specifically:
`Date · Folder · Automated · Regression · Score%`

## Features

- **Trend / Area / Bar** charts with per-folder colour coding
- **KPA Forecast** (Regression Rate sheet only) — projects each team's automation rate to a configurable target % and deadline; flags teams that need acceleration
- **KPI cards** — latest value, delta vs previous period, top performer
- **Data table** view with sort
- **CSV export** and **PNG export** of the active chart
- **Multi-sheet** support — tab selector auto-populates from spreadsheet
- Settings modal for credential management and sheet label renaming

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design, data model, and phase breakdown.
