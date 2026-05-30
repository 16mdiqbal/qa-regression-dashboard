const FOLDER_COLORS: Record<string, string> = {
  CoreApp: '#6366f1',
  FSBP:    '#f59e0b',
  PLC:     '#10b981',
  PPIND:   '#3b82f6',
  O2O:     '#ef4444',
  P2P:     '#8b5cf6',
  TOTAL:   '#64748b',
};

const DEFAULT_COLOR = '#94a3b8';

export function getFolderColor(folder: string): string {
  return FOLDER_COLORS[folder] ?? DEFAULT_COLOR;
}
