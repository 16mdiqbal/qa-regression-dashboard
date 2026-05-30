import type { SheetData, RegressionEntry } from '../types';
import { MOCK_SHEETS } from './mockData';
import { loadConfig, extractSpreadsheetId } from '../config/runtimeConfig';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type Credentials =
  | { mode: 'apiKey'; apiKey: string; spreadsheetId: string }
  | { mode: 'oauth2'; clientId: string; clientSecret: string; refreshToken: string; spreadsheetId: string };

let cachedToken: { token: string; expiresAt: number } | null = null;

export function invalidateTokenCache(): void {
  cachedToken = null;
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken.token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}) — check your credentials`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

async function authFetch(url: string, creds: Credentials): Promise<Response> {
  if (creds.mode === 'apiKey') {
    return fetch(`${url}${url.includes('?') ? '&' : '?'}key=${creds.apiKey}`);
  }
  const token = await getAccessToken(creds.clientId, creds.clientSecret, creds.refreshToken);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    cachedToken = null;
    throw new Error('Authentication expired — please reconnect in Settings');
  }
  return res;
}

function getCredentials(): Credentials | null {
  const runtime = loadConfig();
  if (runtime?.clientId && runtime?.clientSecret && runtime?.refreshToken && runtime?.spreadsheetUrl) {
    return {
      mode: 'oauth2',
      clientId: runtime.clientId,
      clientSecret: runtime.clientSecret,
      refreshToken: runtime.refreshToken,
      spreadsheetId: extractSpreadsheetId(runtime.spreadsheetUrl),
    };
  }
  if (runtime?.apiKey && runtime?.spreadsheetUrl) {
    return { mode: 'apiKey', apiKey: runtime.apiKey, spreadsheetId: extractSpreadsheetId(runtime.spreadsheetUrl) };
  }
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY as string | undefined;
  const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID as string | undefined;
  if (apiKey && spreadsheetId) return { mode: 'apiKey', apiKey, spreadsheetId };
  return null;
}

function parseNum(s: string | undefined): number {
  return Number.parseFloat(s?.replace('%', '') ?? '0') || 0;
}

function parseRegressionEntries(values: string[][]): RegressionEntry[] {
  return values
    .slice(1)
    .map((row) => ({
      date: (row[0] ?? '').trim(),
      folderName: (row[1] ?? '').trim(),
      automated: parseNum(row[2]),
      regression: parseNum(row[3]),
      value: parseNum(row[4]),
    }))
    .filter((e) => e.date && e.folderName && e.regression > 0);
}

function parseSheetData(values: string[][], sheetName: string): SheetData {
  if (values.length < 2) {
    return { name: sheetName, metricLabel: 'Value', isPercentage: false, entries: [] };
  }
  const headers = values[0];
  const metricLabel = headers.at(-1) ?? 'Value';
  const isPercentage = /(%|rate|score)/i.test(metricLabel);
  const entries = values
    .slice(1)
    .map((row) => ({
      date: (row[0] ?? '').trim(),
      folderName: (row[1] ?? '').trim(),
      value: parseNum(row.at(-1)),
    }))
    .filter((e) => e.date && e.folderName);

  const regressionEntries = /regression/i.test(sheetName)
    ? parseRegressionEntries(values)
    : undefined;

  return { name: sheetName, metricLabel, isPercentage, entries, regressionEntries };
}

export async function fetchSheetNames(): Promise<string[]> {
  const creds = getCredentials();
  if (!creds) return Object.keys(MOCK_SHEETS);
  const url = `${SHEETS_API_BASE}/${creds.spreadsheetId}?fields=sheets.properties.title`;
  const res = await authFetch(url, creds);
  if (!res.ok) throw new Error(`Sheets API error ${res.status}: ${res.statusText}`);
  const json = (await res.json()) as { sheets: Array<{ properties: { title: string } }> };
  return json.sheets.map((s) => s.properties.title);
}

export async function fetchSheetData(name: string): Promise<SheetData> {
  const creds = getCredentials();
  if (!creds) return MOCK_SHEETS[name] ?? Object.values(MOCK_SHEETS)[0];
  const range = encodeURIComponent(`${name}!A:Z`);
  const url = `${SHEETS_API_BASE}/${creds.spreadsheetId}/values/${range}`;
  const res = await authFetch(url, creds);
  if (!res.ok) throw new Error(`Sheets API error ${res.status}: ${res.statusText}`);
  const json = (await res.json()) as { values?: string[][] };
  return parseSheetData(json.values ?? [], name);
}
