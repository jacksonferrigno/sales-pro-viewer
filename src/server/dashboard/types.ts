import "server-only";

import type { ModelCallAnalysis } from "@/server/analysis/call-analysis-schema";
import type { TrendTag } from "@/server/analysis/trend-tags";
import type { SalesMotionSummary } from "@/server/sales-summary/summary-schema";
import type { CallTranscript } from "@/server/transcripts/types";

export type DurationBucket = "short" | "medium" | "long";

export type DashboardFilters = {
  outcome?: string;
  rep?: string;
  cuisine?: string;
  restaurantType?: string;
  duration?: DurationBucket;
  tag?: TrendTag;
  polarity?: "good" | "bad";
  page: number;
};

export type DashboardRow = {
  call: CallTranscript;
  analysis: ModelCallAnalysis;
  analyzedAt: string;
};

export type RollupCounts = {
  totalCalls: number;
  bookedCalls: number;
  bookingRate: number;
  avgDurationMin: number;
  good: TagRollup[];
  bad: TagRollup[];
};

export type TagRollup = {
  tag: TrendTag;
  count: number;
};

export type DashboardPage = {
  rows: DashboardRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DashboardData = {
  filters: DashboardFilters;
  rollups: RollupCounts;
  salesMotionSummary: SalesMotionSummary | null;
  page: DashboardPage;
  filterOptions: {
    outcomes: string[];
    reps: string[];
    cuisines: string[];
    restaurantTypes: string[];
  };
};

export const DASHBOARD_PAGE_SIZE = 50;

export function bucketForDuration(minutes: number): DurationBucket {
  if (minutes <= 2) return "short";
  if (minutes <= 7) return "medium";
  return "long";
}
