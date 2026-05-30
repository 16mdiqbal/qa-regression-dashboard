import type { SheetData, RegressionEntry } from '../types';

const DATES = [
  '1-3-2026', '8-3-2026', '15-3-2026', '22-3-2026', '29-3-2026',
  '5-4-2026', '12-4-2026', '19-4-2026', '26-4-2026', '1-5-2026',
];

const FOLDERS = ['CoreApp', 'FSBP', 'PLC', 'PPIND', 'O2O', 'P2P', 'TOTAL'];

// Regression Rate — Score %
const REGRESSION_SCORES: Record<string, number[]> = {
  CoreApp: [88,   84,   82,   86,   89,   91,   93,   94,   94,   95  ],
  FSBP:    [75,   77,   80,   82,   84,   86,   88,   86,   85,   85.5],
  PLC:     [94.2, 95,   96.4, 97,   97.5, 98,   98.8, 98.7, 99,   97.7],
  PPIND:   [85,   79,   78,   75,   76,   81,   87,   89,   90,   88.8],
  O2O:     [55,   56,   58,   60,   62,   64,   66,   68,   65,   67  ],
  P2P:     [80,   83,   86,   89,   92,   94,   95.8, 97.9, 98.8, 100 ],
  TOTAL:   [86.2, 85.2, 84.8, 85.5, 87.9, 90.2, 92.1, 92.9, 94,   95  ],
};

// Total regression scenario counts per team (stable denominator)
const REGRESSION_TOTALS: Record<string, number> = {
  CoreApp: 1200,
  FSBP:    500,
  PLC:     300,
  PPIND:   400,
  O2O:     300,
  P2P:     250,
  TOTAL:   2950,
};

// Backlog — Count (open bug/test backlog items)
const BACKLOG_COUNTS: Record<string, number[]> = {
  CoreApp: [20, 18, 17, 16, 14, 12, 10,  8,  8,  7],
  FSBP:    [25, 24, 22, 20, 18, 16, 14, 12, 11, 10],
  PLC:     [ 8,  7,  7,  6,  5,  5,  4,  3,  3,  2],
  PPIND:   [15, 14, 13, 12, 11, 10,  9,  8,  7,  6],
  O2O:     [22, 21, 20, 19, 17, 16, 14, 13, 12, 11],
  P2P:     [12, 11, 10,  9,  8,  7,  6,  5,  4,  3],
  TOTAL:   [102, 95, 89, 82, 73, 66, 57, 49, 45, 39],
};

// Failure Rate — Failure %
const FAILURE_RATES: Record<string, number[]> = {
  CoreApp: [12,   11.5, 10.8,  9.5,  8.2,  7,    5.8,  4.5,  4.5,  3.8],
  FSBP:    [18,   17.2, 16,   14.5,  13,   11.5, 10.2,  9,    8.5,  8  ],
  PLC:     [ 5.8,  5.2,  4.8,  4,    3.5,  3,    2.5,  2,    1.8,  1.5],
  PPIND:   [15,   14.5, 13.8, 13,   12.5,  11,   10,    9.5,  8.5,  7.8],
  O2O:     [25,   23.5, 22,   20,   18,   16.5,  14.5, 12.5, 11.5, 10.2],
  P2P:     [12,   11,   10,    8.5,  7,    5.5,   4.5,  3.5,  3,    2.5],
  TOTAL:   [14.6, 13.8, 13.1, 11.8, 10.5,  9.3,   7.9,  6.8,  6.3,  5.6],
};

function buildEntries(scores: Record<string, number[]>) {
  return DATES.flatMap((date, i) =>
    FOLDERS.map((folder) => ({
      date,
      folderName: folder,
      value: scores[folder][i],
    })),
  );
}

function buildRegressionEntries(): RegressionEntry[] {
  return DATES.flatMap((date, i) =>
    FOLDERS.map((folder) => {
      const total = REGRESSION_TOTALS[folder];
      const score = REGRESSION_SCORES[folder][i];
      return {
        date,
        folderName: folder,
        value: score,
        regression: total,
        automated: Math.round((score / 100) * total),
      };
    }),
  );
}

export const MOCK_REGRESSION_ENTRIES: RegressionEntry[] = buildRegressionEntries();

export const MOCK_SHEETS: Record<string, SheetData> = {
  'Regression Rate': {
    name: 'Regression Rate',
    metricLabel: 'Score %',
    isPercentage: true,
    entries: buildEntries(REGRESSION_SCORES),
    regressionEntries: MOCK_REGRESSION_ENTRIES,
  },
  'Backlog': {
    name: 'Backlog',
    metricLabel: 'Count',
    isPercentage: false,
    entries: buildEntries(BACKLOG_COUNTS),
  },
  'Failure Rate': {
    name: 'Failure Rate',
    metricLabel: 'Failure %',
    isPercentage: true,
    entries: buildEntries(FAILURE_RATES),
  },
};
