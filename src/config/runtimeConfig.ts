export interface SheetMapping {
  sheetName: string;
  reportLabel: string;
}

export interface RuntimeConfig {
  spreadsheetUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  sheetMappings: SheetMapping[];
}

interface EncryptedStorage {
  encrypted: true;
  salt: string;
  iv: string;
  data: string;
}

const STORAGE_KEY = 'qa_dashboard_config';
const SESSION_KEY = 'qa_dashboard_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;

function initSessionFromStorage(): RuntimeConfig | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const { config, expiresAt } = JSON.parse(raw) as { config: RuntimeConfig; expiresAt: number };
    if (Date.now() > expiresAt) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return config;
  } catch { return null; }
}

let sessionConfig: RuntimeConfig | null = initSessionFromStorage();

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCodePoint(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.codePointAt(i) ?? 0;
  return bytes.buffer;
}

async function deriveKey(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function loadConfig(): RuntimeConfig | null {
  return sessionConfig;
}

export function isConfigEncrypted(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as { encrypted?: boolean }).encrypted === true;
  } catch {
    return false;
  }
}

export async function encryptAndSave(config: RuntimeConfig, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt.buffer);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(config)),
  );
  const stored: EncryptedStorage = {
    encrypted: true,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    data: bufToBase64(encrypted),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  sessionConfig = config;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ config, expiresAt: Date.now() + SESSION_TTL }));
}

export async function decryptAndLoad(pin: string): Promise<RuntimeConfig> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('No saved config found');
  const stored = JSON.parse(raw) as EncryptedStorage;
  const key = await deriveKey(pin, base64ToBuf(stored.salt));
  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(base64ToBuf(stored.iv)) },
      key,
      base64ToBuf(stored.data),
    );
  } catch {
    throw new Error('Incorrect PIN — please try again');
  }
  const config = JSON.parse(new TextDecoder().decode(decrypted)) as RuntimeConfig;
  sessionConfig = config;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ config, expiresAt: Date.now() + SESSION_TTL }));
  return config;
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionConfig = null;
}

export function extractSpreadsheetId(urlOrId: string): string {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(urlOrId);
  return match ? match[1] : urlOrId.trim();
}

export function isLiveConfig(): boolean {
  const envLive = Boolean(
    import.meta.env.VITE_GOOGLE_SHEETS_API_KEY && import.meta.env.VITE_SPREADSHEET_ID,
  );
  const cfg = loadConfig();
  return (
    envLive ||
    Boolean(cfg?.apiKey && cfg?.spreadsheetUrl) ||
    Boolean(cfg?.clientId && cfg?.clientSecret && cfg?.refreshToken && cfg?.spreadsheetUrl)
  );
}
