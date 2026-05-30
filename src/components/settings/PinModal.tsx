import { useState, useEffect } from 'react';
import { decryptAndLoad, clearConfig } from '../../config/runtimeConfig';

interface PinModalProps {
  readonly onUnlocked: () => void;
  readonly onCleared: () => void;
}

export function PinModal({ onUnlocked, onCleared }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter') void handleUnlock();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  async function handleUnlock() {
    if (!pin || unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      await decryptAndLoad(pin);
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
      setPin('');
    } finally {
      setUnlocking(false);
    }
  }

  function handleClear() {
    clearConfig();
    onCleared();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Enter your PIN</h2>
          <p className="text-xs text-gray-400 mt-1">Your credentials are encrypted. Enter your PIN to unlock.</p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(null); }}
            placeholder="PIN"
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-center tracking-widest text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={!pin || unlocking}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unlocking && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {unlocking ? 'Unlocking…' : 'Unlock'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Forgot PIN? Clear config &amp; start over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
