export type ReportCategory = "regulatory" | "inventory" | "compliance" | "operations" | "audit";

export type ReportFormat = "json" | "csv";

/** Every report the application can generate. The catalog, the messages and `runReport` agree on it. */
export type ReportId =
  | "ctls-monthly"
  | "destruction-register"
  | "inventory-snapshot"
  | "state-at-date"
  | "inventory-movement"
  | "transfer-log"
  | "experiment-summary"
  | "stage-history"
  | "activity-audit";

export type ReportFilters = {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
  licenseId?: string;
  experimentId?: number;
  unitType?: string;
  locationId?: number;
  entityType?: string;
  action?: string;
  status?: "active" | "completed" | "all";
  /** `YYYY-MM-DD` in the laboratory time zone: the state-at-date report reads the end of that day. */
  asOf?: string;
};

/** Which filter controls a report offers. Labels live in messages/<locale>/reports.json. */
export type ReportFilterKey =
  | "month"
  | "dateRange"
  | "license"
  | "experiment"
  | "unitType"
  | "location"
  | "audit"
  | "status"
  | "asOf";

/**
 * Catalog entry. Deliberately has no title or description: the catalog returns ids and the UI
 * translates them (`reports.catalog.<id>`). A generated report keeps its own English title and
 * column labels in `ReportResult` because exports are stable regulatory documents.
 */
export type ReportMeta = {
  id: ReportId;
  category: ReportCategory;
  adminOnly?: boolean;
  filters: ReportFilterKey[];
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type ReportSection = {
  /** Stable identifier the on-screen display translates; exports use `title` and column labels. */
  id?: string;
  title: string;
  description?: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: Record<string, string | number | null>;
};

export type CtlsLine = {
  lineId: string;
  label: string;
  indent: number;
  unit: string;
  opening: number | null;
  additions: number | null;
  reductions: number | null;
  closing: number | null;
  /**
   * Net change from re-measurement (weights, seed counts) that is neither an addition nor a
   * reduction. Absent on unit-count lines, where closing = opening + additions - reductions.
   */
  adjustments?: number | null;
  /** closing = opening + additions - reductions + adjustments. */
  reconciles?: boolean;
  isTotal?: boolean;
};

export type ReportResult = {
  meta: {
    reportId: string;
    title: string;
    generatedAt: string;
    periodLabel?: string;
    licenseId?: string;
    subtitle?: string;
  };
  sections: ReportSection[];
  ctls?: {
    lines: CtlsLine[];
    reconciliationNotes?: string[];
    /** True when every flow line reconciles: opening + additions - reductions + adjustments = closing. */
    reconciles?: boolean;
  };
  kpis?: Array<{ id?: string; label: string; value: string | number }>;
};
