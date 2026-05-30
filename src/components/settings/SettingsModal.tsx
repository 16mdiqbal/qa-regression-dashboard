/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import {
  loadConfig,
  encryptAndSave,
  clearConfig,
  extractSpreadsheetId,
} from '../../config/runtimeConfig';
import type { SheetMapping } from '../../config/runtimeConfig';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function buildMappings(names: string[], existing: SheetMapping[]): SheetMapping[] {
  return names.map((sheetName) => ({
    sheetName,
    reportLabel: existing.find((m) => m.sheetName === sheetName)?.reportLabel ?? sheetName,
  }));
}

interface SettingsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfigSaved: () => void;
}

export function SettingsModal({ open, onClose, onConfigSaved }: SettingsModalProps) {
  const [step, setStep] = useState<'connect' | 'labels'>('connect');
  const [url, setUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [mappings, setMappings] = useState<SheetMapping[]>([]);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const cfg = loadConfig();
      setUrl(cfg?.spreadsheetUrl ?? '');
      setClientId(cfg?.clientId ?? '');
      setClientSecret(cfg?.clientSecret ?? '');
      setRefreshToken(cfg?.refreshToken ?? '');
      setPin('');
      setIsConnected(Boolean(cfg?.clientId && cfg?.clientSecret && cfg?.refreshToken));
      setMappings(cfg?.sheetMappings ?? []);
      setStep('connect');
      setConnectError(null);
      setShowSecret(false);
      setShowToken(false);
      setShowPin(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (!tokenRes.ok) throw new Error(`Token exchange failed (${tokenRes.status}) — check your credentials`);
      const tokenJson = (await tokenRes.json()) as { access_token: string };

      const id = extractSpreadsheetId(url);
      const apiUrl = `${SHEETS_API_BASE}/${id}?fields=sheets.properties.title`;
      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${tokenJson.access_token}` } });
      if (!res.ok) throw new Error(`Sheets API error ${res.status} — check your Spreadsheet URL`);
      const json = (await res.json()) as { sheets: Array<{ properties: { title: string } }> };
      const names = json.sheets.map((s) => s.properties.title);
      const existing = loadConfig()?.sheetMappings ?? [];
      setMappings(buildMappings(names, existing));
      setStep('labels');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await encryptAndSave({ spreadsheetUrl: url, clientId, clientSecret, refreshToken, sheetMappings: mappings }, pin);
      onConfigSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    clearConfig();
    onConfigSaved();
    onClose();
  }

  function updateLabel(sheetName: string, reportLabel: string) {
    setMappings((prev) =>
      prev.map((m) => (m.sheetName === sheetName ? { ...m, reportLabel } : m)),
    );
  }

  const canConnect = Boolean(url && clientId && clientSecret && refreshToken && pin.length >= 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'labels' && (
              <button
                type="button"
                onClick={() => setStep('connect')}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mr-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 'connect' && isConnected && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Connected to Google Sheets</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs break-all">
                  {url.length > 60 ? `${url.slice(0, 57)}…` : url}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setStep('labels')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Manage Labels →
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="shrink-0 rounded-lg border border-red-300 text-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {step === 'connect' && !isConnected && (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="settings-url" className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Spreadsheet URL
                </label>
                <input
                  id="settings-url"
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setIsConnected(false); }}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="settings-client-id" className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Client ID
                </label>
                <input
                  id="settings-client-id"
                  type="text"
                  value={clientId}
                  onChange={(e) => { setClientId(e.target.value); setIsConnected(false); }}
                  placeholder="your-client-id.apps.googleusercontent.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="settings-client-secret" className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    id="settings-client-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => { setClientSecret(e.target.value); setIsConnected(false); }}
                    placeholder="GOCSPX-…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showSecret ? 'Hide client secret' : 'Show client secret'}
                  >
                    {showSecret ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="settings-refresh-token" className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Refresh Token
                </label>
                <div className="relative">
                  <input
                    id="settings-refresh-token"
                    type={showToken ? 'text' : 'password'}
                    value={refreshToken}
                    onChange={(e) => { setRefreshToken(e.target.value); setIsConnected(false); }}
                    placeholder="1//0g…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showToken ? 'Hide refresh token' : 'Show refresh token'}
                  >
                    {showToken ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="settings-pin" className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  PIN <span className="normal-case font-normal text-gray-400">(min 4 digits — encrypts your credentials)</span>
                </label>
                <div className="relative">
                  <input
                    id="settings-pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {connectError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {connectError}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={!canConnect || connecting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                )}
                {connecting ? 'Connecting…' : 'Connect →'}
              </button>
            </div>
          )}

          {step === 'labels' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400">
                Assign a friendly name to each sheet tab. This label will appear in the dashboard tabs.
              </p>
              <div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sheet Tab</p>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Report Label</p>
                </div>
                <div className="flex flex-col gap-2">
                  {mappings.map(({ sheetName, reportLabel }) => (
                    <div key={sheetName} className="grid grid-cols-2 gap-3 items-center">
                      <p className="text-sm text-gray-500 truncate">{sheetName}</p>
                      <input
                        type="text"
                        value={reportLabel}
                        onChange={(e) => updateLabel(sheetName, e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                )}
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isConnected && (
          <div className="px-6 pb-5 border-t border-gray-50 pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear config &amp; use mock data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
