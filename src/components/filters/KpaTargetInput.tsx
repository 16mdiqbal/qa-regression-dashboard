import { useState, useEffect, useRef } from 'react';
import { useFilter, DEFAULT_KPA_TARGET } from '../../context/FilterContext';

export function KpaTargetInput() {
  const { kpaTarget, setKpaTarget } = useFilter();
  const [raw, setRaw] = useState(String(kpaTarget));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function commit(value: string) {
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n) && n > 0 && n <= 100) {
      setKpaTarget(Math.round(n * 10) / 10); // 1 decimal max
    } else {
      setRaw(String(kpaTarget)); // revert invalid input
    }
  }

  function handleChange(value: string) {
    setRaw(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(value), 400);
  }

  function handleBlur(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(value);
  }

  function handleEnter() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(raw);
  }

  const isDefault = kpaTarget === DEFAULT_KPA_TARGET;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          KPA Target
        </p>
        {!isDefault && (
          <button
            type="button"
            onClick={() => { setKpaTarget(DEFAULT_KPA_TARGET); setRaw(String(DEFAULT_KPA_TARGET)); }}
            className="text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            Reset to {DEFAULT_KPA_TARGET}%
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={(e) => handleBlur(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEnter(); }}
            className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-colors"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            %
          </span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        Teams need to reach {kpaTarget}% by deadline
      </p>
    </div>
  );
}
