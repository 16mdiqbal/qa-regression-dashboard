/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { sortDates } from '../utils/date';

export type ChartType = 'trend' | 'bar' | 'area' | 'forecast';

export const DEFAULT_FORECAST_DEADLINE = new Date(2027, 2, 31); // March 31, 2027
export const DEFAULT_KPA_TARGET = 96;

interface FilterState {
  chartType: ChartType;
  selectedFolder: string;
  selectedDates: string[];
  forecastDeadline: Date;
  kpaTarget: number;
}

interface FilterContextValue extends FilterState {
  setChartType: (type: ChartType) => void;
  setSelectedFolder: (folder: string) => void;
  setSelectedDates: (dates: string[]) => void;
  setForecastDeadline: (d: Date) => void;
  setKpaTarget: (target: number) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

interface FilterProviderProps {
  children: ReactNode;
  availableDates: string[];
}

export function FilterProvider({ children, availableDates }: FilterProviderProps) {
  const sorted = sortDates(availableDates);

  const [chartType, setChartType] = useState<ChartType>('trend');
  const [selectedFolder, setSelectedFolder] = useState('ALL');
  const [selectedDates, setSelectedDates] = useState<string[]>(sorted);
  const [forecastDeadline, setForecastDeadline] = useState<Date>(DEFAULT_FORECAST_DEADLINE);
  const [kpaTarget, setKpaTarget] = useState<number>(DEFAULT_KPA_TARGET);

  const resetFilters = useCallback(() => {
    setChartType('trend');
    setSelectedFolder('ALL');
    setSelectedDates(sorted);
    setForecastDeadline(DEFAULT_FORECAST_DEADLINE);
    setKpaTarget(DEFAULT_KPA_TARGET);
  }, [sorted]);

  return (
    <FilterContext.Provider value={{
      chartType, selectedFolder, selectedDates, forecastDeadline, kpaTarget,
      setChartType, setSelectedFolder, setSelectedDates, setForecastDeadline, setKpaTarget, resetFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilter must be used within a FilterProvider');
  return ctx;
}
