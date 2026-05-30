import { isLiveConfig } from '../../config/runtimeConfig';

interface HeaderProps {
  readonly onOpenSettings: () => void;
  readonly onHome: () => void;
  readonly refreshedAt?: string;
}

export function Header({ onOpenSettings, onHome, refreshedAt }: HeaderProps) {
  const isLive = isLiveConfig();

  return (
    <header
      className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-30 border-b"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        fontFamily: 'var(--font-main)',
      }}
    >
      {/* Left: logo + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onHome}
          title="Go to home"
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 transition-colors hover:opacity-85"
          style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 17 8 11 13 14 21 5" />
            <line x1="3" y1="20" x2="21" y2="20" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-extrabold tracking-[-0.02em] leading-tight" style={{ color: 'var(--text)' }}>
            QA Regression Dashboard
          </h1>
          <p className="hidden sm:block text-[12px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Track test-suite health over time
          </p>
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {refreshedAt && (
          <span className="hidden sm:block text-[12px]" style={{ color: 'var(--text-faint)' }}>
            Refreshed {refreshedAt}
          </span>
        )}

        <span
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border"
          style={
            isLive
              ? { background: 'color-mix(in srgb,#10b981 12%,transparent)', borderColor: 'color-mix(in srgb,#10b981 32%,transparent)', color: '#059669' }
              : { background: 'color-mix(in srgb,#f59e0b 14%,white)', borderColor: 'color-mix(in srgb,#f59e0b 32%,transparent)', color: '#b45309' }
          }
        >
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ background: isLive ? '#10b981' : '#f59e0b' }}
          />
          {isLive ? 'Google Sheets' : 'Mock data'}
        </span>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings"
          className="w-9 h-9 flex items-center justify-center rounded-[10px] border transition-all hover:border-[var(--text-faint)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onHome}
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border text-[13px] font-semibold transition-all hover:border-[var(--text-faint)] hover:text-[var(--text)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-main)' }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 10v10h14V10" />
          </svg>
          Home
        </button>
      </div>
    </header>
  );
}
