export interface SheetEntry {
  date: string;
  folderName: string;
  value: number;
}

interface SheetMeta {
  name: string;
  metricLabel: string;
  isPercentage: boolean;
}

export interface SheetData extends SheetMeta {
  entries: SheetEntry[];
  regressionEntries?: RegressionEntry[];
}

export interface RegressionEntry extends SheetEntry {
  automated: number;
  regression: number;
}

export interface TeamForecast {
  team: string;
  currentRate: number;
  currentAutomated: number;
  totalScenarios: number;
  requiredPerMonth: number;
  status: 'achieved' | 'on-track' | 'needs-acceleration';
  historical: { label: string; rate: number }[];
  projected: { label: string; rate: number; automated: number }[];
}
