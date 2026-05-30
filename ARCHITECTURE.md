# QA Regression Dashboard — Architecture

## Project Overview

A polished, interactive analytics dashboard built with **React + TypeScript + Tailwind CSS** that reads QA test results directly from **Google Sheets** and renders multiple chart types with dynamic filtering. Google Sheets acts as the single source of truth / data backend. The frontend handles all data fetching, filtering, and visualization logic.

The dashboard supports multiple sheet tabs (Regression Rate, Backlog, Failure Rate) with a unified generic data model — each sheet drives its own KPI cards, charts, and table view. Credentials are stored encrypted in the browser using AES-GCM with a user-chosen PIN.

**Phase 8 (Day 2):** Google Sheets API calls will be moved to an AWS Lambda backend (Python), storing OAuth credentials in AWS Secrets Manager — removing credentials from the browser entirely.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| Charting | Recharts |
| Data Source | Google Sheets API v4 |
| Auth (Sheets) | OAuth 2.0 (Client ID + Client Secret + Refresh Token) or API Key |
| Credential Storage | AES-GCM encryption via Web Crypto API, PIN-derived key (PBKDF2) |
| Session Cache | sessionStorage, 24-hour TTL |
| Deployment | Any static host (S3, Vercel, Netlify, etc.) |
| Day 2 Backend | AWS Lambda (Python) + API Gateway HTTP API + Secrets Manager |

---

## Data Model

The dashboard supports multiple sheet tabs. Each tab follows a flexible column layout where the **last column** is always the primary metric value. All other columns between Date/Folder and the metric are ignored at render time.

### Regression Rate sheet (columns A–E)

| Date | Folder Name | Automated | Regression | Score |
|---|---|---|---|---|
| 1-5-2026 | CoreApp | 1201 | 1250 | 95% |
| 1-5-2026 | TOTAL | 4000 | 4200 | 95% |

### Failure Rate sheet (columns A–E)

| Date | Folder Name | Total Tests Executed | Failed Cases | Failure % |
|---|---|---|---|---|
| 1-5-2026 | CoreApp | 1250 | 50 | 3.8% |

### Backlog sheet (columns A–E)

| Date | Folder Name | Automated | Regression | Count |
|---|---|---|---|---|
| 1-5-2026 | CoreApp | 1201 | 1250 | 12% |

- **Date** — test run date in `D-M-YYYY` format
- **Folder Name** — test suite / module (CoreApp, FSBP, PLC, PPIND, O2O, P2P, TOTAL)
- **Last column** — the primary metric, parsed as a number (% symbol stripped automatically)
- One row per folder per date; multiple dates produce the trend line

---

## TypeScript Types (`src/types/index.ts`)

```ts
export interface SheetEntry {
  date: string;       // e.g. "1-5-2026"
  folderName: string; // e.g. "CoreApp"
  value: number;      // last-column metric as a number (e.g. 95 for 95%)
}

export interface SheetMeta {
  name: string;         // sheet tab name, e.g. "Regression Rate"
  metricLabel: string;  // last column header, e.g. "Score %"
  isPercentage: boolean;// true if metricLabel matches /(%|rate|score)/i
}

export interface SheetData extends SheetMeta {
  entries: SheetEntry[];
  regressionEntries?: RegressionEntry[]; // populated only for Regression Rate sheet
}

// Regression Rate sheet — columns A–E (Date, Folder, Automated, Regression, Score%)
export interface RegressionEntry extends SheetEntry {
  automated: number;  // col C: automated test count
  regression: number; // col D: total regression scenario count
}

// Output of computeForecast() for a single team
export interface TeamForecast {
  team: string;
  currentRate: number;       // latest Score% value
  currentAutomated: number;  // derived from Score% × regression (authoritative)
  totalScenarios: number;    // col D regression count
  requiredPerMonth: number;  // scenarios to automate per month at constant pace
  status: 'achieved' | 'on-track' | 'needs-acceleration';
  historical: { label: string; rate: number }[];
  projected: { label: string; rate: number; automated: number }[];
}
```

---

## Phases

---

### Phase 1 — Project Setup & Google Sheets Integration ✅ COMPLETE

**Goal:** Scaffold the project, connect to Google Sheets, confirm raw data is accessible.

#### Tasks
- [x] Initialize React + TypeScript project (Vite)
- [x] Install and configure Tailwind CSS v4
- [x] Install Recharts
- [x] Set up Google Sheets API v4 access (API Key via `.env`)
- [x] Create `sheetsService.ts` — fetches and parses sheet data; falls back to mock when env vars are absent
- [x] Define shared TypeScript types: `SheetEntry`, `SheetMeta`, `SheetData`
- [x] Create mock data for realistic trend visualisation

#### Key Files
| File | Purpose |
|---|---|
| `src/types/index.ts` | `SheetEntry`, `SheetMeta`, `SheetData` types |
| `src/services/mockData.ts` | Mock dataset: 10 dates × 7 folders for 3 sheets |
| `src/services/sheetsService.ts` | `fetchSheetNames()`, `fetchSheetData()` — real API or mock fallback |
| `src/App.tsx` | Bootstraps data load, handles loading/error states |
| `.env` / `.env.example` | API key + spreadsheet ID env vars |

---

### Phase 2 — Core UI Shell & Navigation ✅ COMPLETE

**Goal:** Build the main dashboard layout — sidebar, chart area, filter panel.

#### Tasks
- [x] Design and implement the main layout: collapsible sidebar + chart canvas area
- [x] Build chart type selector (Trend Line, Area, Bar, Pie)
- [x] Build folder selector component (All Folders / Individual Folder dropdown)
- [x] Build date multi-selector (individual date toggles from available dates)
- [x] Wire filter state using React Context (`FilterContext.tsx`)
- [x] Sidebar collapse/expand toggle button

#### Key Files
| File | Purpose |
|---|---|
| `src/context/FilterContext.tsx` | `FilterProvider`, `useFilter` hook — `chartType`, `selectedFolder`, `selectedDates`, `resetFilters` |
| `src/utils/date.ts` | `parseDMY`, `sortDates`, `formatDMY` — handles `D-M-YYYY` format |
| `src/config/chartColors.ts` | `FOLDER_COLORS` palette + `getFolderColor()` helper |
| `src/components/layout/Dashboard.tsx` | Root layout — header + collapsible sidebar + chart canvas; CSV export logic |
| `src/components/layout/Sidebar.tsx` | 256px left panel with all filters + Reset Filters button |
| `src/components/layout/Header.tsx` | Top bar with title, settings button, connection status indicator |
| `src/components/filters/ChartTypeSelector.tsx` | Trend / Area / Bar / Pie toggle buttons |
| `src/components/filters/FolderSelector.tsx` | Folder dropdown populated from data |
| `src/components/filters/DateSelector.tsx` | Multi-select date picker from available dates |

---

### Phase 3 — Trend Line Chart (Primary Chart) ✅ COMPLETE

**Goal:** Implement the core trend line chart — metric value over time per folder.

#### Tasks
- [x] Build `TrendLineChart.tsx` using Recharts `LineChart`
- [x] Plot metric value on Y-axis (percentage or raw), dates on X-axis
- [x] Render one line per folder (All Folders) or single line (one folder)
- [x] TOTAL line renders thicker and on top of all other lines
- [x] Custom tooltip showing folder, date, value

#### Key Files
| File | Purpose |
|---|---|
| `src/components/charts/TrendLineChart.tsx` | Recharts `LineChart` — pivot, filter, render, custom tooltip |
| `src/components/charts/ChartRenderer.tsx` | Reads `chartType` from context; routes to correct chart component |

---

### Phase 4 — Additional Chart Types ✅ COMPLETE

**Goal:** Add area and bar chart views.

#### Tasks
- [x] Build `AreaChart.tsx` — filled area trend chart, same pivot as TrendLineChart
- [x] Build `BarChart.tsx` — average value per folder (All) or value per date (single folder)
- [x] All charts share the same filter state via `FilterContext`

#### Key Files
| File | Purpose |
|---|---|
| `src/components/charts/AreaChart.tsx` | Recharts `AreaChart` — filled areas with 0.08 opacity, connects nulls |
| `src/components/charts/BarChart.tsx` | Recharts `BarChart` — per-folder avg or per-date scores; custom per-bar color |

---

### Phase 5 — Polish, UX & Error Handling ✅ COMPLETE

**Goal:** Make the dashboard production-ready.

#### Tasks
- [x] Animated spinner while data fetches
- [x] Friendly error state UI when API call fails
- [x] Empty state UI when filters return no data (all chart types)
- [x] Smooth fade-in transition when switching chart types
- [x] Consistent colour palette across all charts
- [x] Remove debug `console.log` from data load path

#### Key Files
| File | Change |
|---|---|
| `src/App.tsx` | Spinner loading state, polished error card |
| `src/index.css` | `@keyframes fadeIn` + `.chart-fade-in` utility class |
| `src/components/charts/EmptyState.tsx` | Shared empty state component used by all charts |
| `src/components/charts/ChartRenderer.tsx` | `key={chartType}` on wrapper div triggers fade-in on chart switch |

---

### Phase 6 — Multi-Sheet Support, Settings, Security & Dashboard Enhancements ✅ COMPLETE

**Goal:** Extend the dashboard from a single regression sheet to multiple configurable sheet tabs; add secure credential storage and a full settings UX; add KPI cards, data table, and CSV export.

#### Multi-Sheet Support
- [x] Refactored `sheetsService.ts` from single `fetchDashboardData()` to `fetchSheetNames()` + `fetchSheetData(name)` — each sheet tab returns its own `SheetData` with its own `metricLabel` and `isPercentage` flag
- [x] `SheetSelector` component — pill tabs for ≤5 sheets, dropdown for >5 — sits above KPI cards
- [x] `FilterContext` re-keyed on active sheet (`key={activeSheetName}`) so date/folder selections reset on sheet change
- [x] `sheetLoading` overlay spinner while switching sheet tabs (non-blocking — previous chart stays visible underneath)
- [x] Sheet label renaming — users can assign friendly names to raw tab names (e.g. "regression-rate" → "Regression Rate") stored as `sheetMappings` in config

#### Mock Data (3 sheets)
- [x] `mock-sheets/` folder contains reference CSVs: `regression-rate.csv`, `backlog.csv`, `failure-rate.csv`
- [x] `src/services/mockData.ts` — `MOCK_SHEETS` object with typed data for all 3 sheets

#### Credential Storage & Security
- [x] OAuth 2.0 support added alongside existing API Key mode (Client ID + Client Secret + Refresh Token)
- [x] `runtimeConfig.ts` — AES-GCM encryption (256-bit) of all credentials in `localStorage`; key derived via PBKDF2 (100 000 iterations, SHA-256, 16-byte random salt)
- [x] `PinModal.tsx` — shown on page load when encrypted config exists but session has expired; user enters PIN to decrypt
- [x] `sessionStorage` cache — decrypted config cached for 24 hours so PIN is only asked once per day
- [x] `SettingsModal.tsx` — two-step flow: Connect (credential entry + PIN) → Manage Labels; when connected shows compact "Connected to Google Sheets" summary with Disconnect button; credential fields hidden when already connected

#### KPI Cards
- [x] `KpiCards.tsx` — 3-card row above chart: **Latest value** (most recent date), **vs Previous Period** (delta with directional colour), **Top/Best Performer** (folder with highest or lowest value depending on metric direction)
- [x] Direction awareness: metrics matching `/failure|count/i` treat lower-is-better; all others treat higher-is-better

#### Data Table View
- [x] `DataTable.tsx` — sortable table (Date / Folder / Metric) toggled from chart card header
- [x] Chart/Table toggle button pair in the chart card header

#### CSV Export
- [x] "Export CSV" button in chart card header — exports currently filtered entries (respects folder + date filters)

#### Header Improvements
- [x] Settings gear button opens `SettingsModal`
- [x] Connection status pill: pulsing green "Google Sheets" when credentials active, amber "Mock data" otherwise

---

### Phase 7 — KPA Forecast Engine ✅ COMPLETE

**Goal:** Add a forecast view (exclusive to the Regression Rate sheet) that projects each team's automation rate month-by-month to a configurable KPA target deadline, and surfaces which teams need to accelerate.

#### What was added
- **`forecast` chart type** added to `ChartType` union in `FilterContext`; sits outside the standard chart-type selector in its own "Analysis" section of the sidebar, visible only when the active sheet is the Regression Rate sheet
- **`RegressionEntry`** — new type extending `SheetEntry` with raw `automated` and `regression` columns; parsed from columns A–E of the Regression Rate sheet by `parseRegressionEntries()` in `sheetsService.ts`
- **`TeamForecast`** — result type returned by `computeForecast()`; carries current rate, automated count, total scenarios, required monthly pace, status, and historical + projected data points
- **`SheetData.regressionEntries`** — optional field added; populated by `sheetsService.ts` only for sheets whose name matches `/regression/i`

#### Forecast logic (`src/utils/forecast.ts`)
- `computeForecast(entries, deadline, kpaTarget)` — for each non-TOTAL team:
  1. Derives `currentAutomated` from `Score%` × `regression` (authoritative column E, not col C)
  2. Computes `targetAutomated = ceil(kpaTarget / 100 × totalScenarios)`
  3. Computes `requiredPerMonth = ceil(remaining / monthsLeft)`
  4. Compares recent monthly gain (last 4 intervals ≈ 1 month of weekly data) vs required monthly gain → status: `achieved | on-track | needs-acceleration`
  5. Returns linear month-by-month projection up to the deadline

#### Sidebar — forecast controls (shown only in forecast mode)
| Component | Purpose |
|---|---|
| `src/components/filters/KpaTargetInput.tsx` | Numeric input (1–100%, step 0.5); debounced 400 ms; "Reset to 96%" link when changed |
| `src/components/filters/DeadlinePicker.tsx` | Month-grid calendar picker (year navigation); past months disabled; default March 2027 |

Both values are stored in `FilterContext` and reset by "Reset Filters".

#### Forecast views
| Component | Purpose |
|---|---|
| `src/components/charts/ForecastChart.tsx` | Recharts `ComposedChart` — solid lines for historical data, dashed lines for projected pace; KPA target reference line in orange; tooltip shows "Projected" badge |
| `src/components/charts/ForecastTable.tsx` | "KPA Pace Plan" table — per-team rows with current %, total scenarios, remaining to automate, required pace/month, projected % per month (first hit highlighted), status badge; sparkline for recent trend |

#### FilterContext additions
| Addition | Detail |
|---|---|
| `forecastDeadline: Date` | Defaults to `new Date(2027, 2, 31)` (March 31 2027) |
| `kpaTarget: number` | Defaults to `96`; exported as `DEFAULT_KPA_TARGET` |
| `setForecastDeadline` / `setKpaTarget` | Setters exposed via context |
| `DEFAULT_FORECAST_DEADLINE` | Exported constant |

#### Dashboard changes (forecast mode)
- Passes `isRegressionSheet` prop to `Sidebar` to conditionally show the Analysis section
- Computes `needsAccelerationCount` from forecast results; renders amber warning badge ("N behind pace") in chart card header when > 0
- In forecast mode the main chart card is fixed at `h-[380px]`; `ForecastTable` renders below it in a scrollable layout
- `ChartRenderer` routes `chartType === 'forecast'` to `ForecastChart`, passing `regressionEntries`

#### Removed
- **Pie chart** — `PieChart.tsx` file removed along with its entry in `ChartTypeSelector` and its route in `ChartRenderer`; `ChartType` no longer includes `'pie'`
- **Export PNG** added to chart header (SVG → Canvas → PNG at 2× DPI via `exportToPng()` in `Dashboard.tsx`)

---

### Phase 8 (Day 2) — Python Lambda Backend _(planned)_

**Goal:** Move all Google Sheets API calls and OAuth credentials to a secure AWS backend — the browser never sees OAuth secrets. The Settings modal's credential entry form is removed entirely; it becomes a label-management-only panel.

#### Architecture
```
Browser → API Gateway HTTP API → Lambda (Python) → Google Sheets API
                                               ↘ Secrets Manager (OAuth credentials)
```

#### Lambda (Python)
- Runtime: **Python 3.12**
- Location: `server/` directory in this repo
- Fetches `client_id`, `client_secret`, `refresh_token` from AWS Secrets Manager at cold start; caches in module-level variables across warm invocations
- Exchanges refresh token for access token; caches with expiry check (60-second buffer)
- Exposes two routes via API Gateway HTTP API:
  - `GET /sheets` → returns `list[str]` of sheet tab names
  - `GET /sheets/{name}` → returns `{"values": list[list[str]]}` (raw Google Sheets range response)
- CORS headers on all responses (`Access-Control-Allow-Origin: *`)
- `OPTIONS /{proxy+}` preflight handler

#### Environment Variables (Lambda)
| Variable | Value |
|---|---|
| `SECRET_NAME` | Secrets Manager secret name, e.g. `qa-dashboard/google-oauth` |
| `SPREADSHEET_ID` | Google Sheets spreadsheet ID |

#### Secrets Manager Secret Structure
```json
{
  "client_id": "…",
  "client_secret": "…",
  "refresh_token": "…"
}
```

#### Frontend Changes (after Lambda is deployed)
- `src/services/sheetsService.ts` — replace OAuth/token logic with `fetch($VITE_API_URL/sheets)` and `fetch($VITE_API_URL/sheets/{name})`; keep `parseSheetData()` and mock fallback when `VITE_API_URL` is absent
- `src/config/runtimeConfig.ts` — strip encryption/PIN/session logic; `RuntimeConfig` becomes `{ sheetMappings: SheetMapping[] }` only; store as plain JSON in `localStorage`
- `src/components/settings/SettingsModal.tsx` — remove connect step; on open call `fetchSheetNames()` and show label-mapping table only
- `src/components/settings/PinModal.tsx` — **delete**
- `src/App.tsx` — remove `needsPin` state and `PinModal` render
- `src/components/layout/Header.tsx` — `isLive = Boolean(import.meta.env.VITE_API_URL)`

#### New Environment Variable (Frontend)
```
VITE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
```

#### AWS Deployment Steps
1. Create Secrets Manager secret `qa-dashboard/google-oauth` with JSON above
2. Create Lambda execution IAM role: `secretsmanager:GetSecretValue` on that secret ARN + `AWSLambdaBasicExecutionRole`
3. Build Lambda deployment package: `cd server && pip install -r requirements.txt -t dist/ && cp handler.py dist/ && cd dist && zip -r ../lambda.zip .`
4. Create Lambda function (Python 3.12), upload `lambda.zip`, set env vars
5. Create API Gateway HTTP API → Lambda integration → routes `GET /sheets`, `GET /sheets/{name}`, `OPTIONS /{proxy+}`
6. Set `VITE_API_URL` in frontend `.env.local`, run `npm run build`

#### Acceptance Criteria
- [ ] `GET /sheets` returns JSON array of sheet names
- [ ] `GET /sheets/{name}` returns `{"values": [[…]]}` matching Google Sheets API format
- [ ] Frontend loads live data with no PIN prompt and no credential fields in Settings
- [ ] OAuth credentials are absent from the browser bundle, localStorage, and network requests
- [ ] Settings modal shows only label mapping
- [ ] Mock data fallback still works when `VITE_API_URL` is unset

---

## Folder Structure

```
src/
├── components/
│   ├── charts/
│   │   ├── TrendLineChart.tsx    ← Phase 3
│   │   ├── AreaChart.tsx         ← Phase 4
│   │   ├── BarChart.tsx          ← Phase 4
│   │   ├── ChartRenderer.tsx     ← Phase 4/5/7
│   │   ├── ForecastChart.tsx     ← Phase 7
│   │   ├── ForecastTable.tsx     ← Phase 7
│   │   ├── KpiCards.tsx          ← Phase 6
│   │   ├── DataTable.tsx         ← Phase 6
│   │   ├── SheetSelector.tsx     ← Phase 6
│   │   └── EmptyState.tsx        ← Phase 5
│   ├── filters/
│   │   ├── ChartTypeSelector.tsx ← Phase 2/7 (Pie removed; Forecast in sidebar Analysis section)
│   │   ├── FolderSelector.tsx    ← Phase 2
│   │   ├── DateSelector.tsx      ← Phase 2
│   │   ├── DeadlinePicker.tsx    ← Phase 7
│   │   └── KpaTargetInput.tsx    ← Phase 7
│   ├── layout/
│   │   ├── Header.tsx            ← Phase 2/6
│   │   ├── Sidebar.tsx           ← Phase 2/7 (isRegressionSheet prop; Analysis section)
│   │   └── Dashboard.tsx         ← Phase 2/6/7 (forecast layout; PNG export; needsAccelerationCount badge)
│   └── settings/
│       ├── SettingsModal.tsx     ← Phase 6 (simplified in Day 2)
│       └── PinModal.tsx          ← Phase 6 (removed in Day 2)
├── config/
│   └── chartColors.ts            ← Phase 2
├── context/
│   └── FilterContext.tsx         ← Phase 2/7 (forecastDeadline, kpaTarget state added)
├── services/
│   ├── sheetsService.ts          ← Phase 1/6/7 (parseRegressionEntries; regressionEntries in SheetData)
│   └── mockData.ts               ← Phase 1/6
├── types/
│   └── index.ts                  ← Phase 1/6/7 (RegressionEntry, TeamForecast added)
├── utils/
│   ├── date.ts                   ← Phase 2
│   └── forecast.ts               ← Phase 7 (computeForecast, projectedMonthLabels)
├── App.tsx
└── main.tsx

mock-sheets/                      ← reference CSVs for mock data
│   ├── regression-rate.csv
│   ├── backlog.csv
│   └── failure-rate.csv

server/                           ← Day 2: Python Lambda (not yet created)
│   ├── handler.py
│   └── requirements.txt
```

---

## Environment Variables

### Current (Phase 1–6)
```
VITE_GOOGLE_SHEETS_API_KEY=    # optional — API Key mode; leave empty to use mock data
VITE_SPREADSHEET_ID=           # required when using API Key mode
```
Credentials entered via the Settings modal are stored AES-GCM encrypted in `localStorage`.

### After Day 2 (Lambda backend)
```
VITE_API_URL=                  # API Gateway base URL; leave empty to use mock data
```
`VITE_GOOGLE_SHEETS_API_KEY` and `VITE_SPREADSHEET_ID` are removed from the frontend. All credentials live in AWS Secrets Manager.
