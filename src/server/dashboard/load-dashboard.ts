import "server-only";

import { TREND_TAGS, type TrendTag } from "@/server/analysis/trend-tags";
import { loadSalesMotionSummary } from "@/server/sales-summary/load-summary";
import { getTranscriptDataSource } from "@/server/transcripts";
import type { CallTranscript } from "@/server/transcripts/types";

import { readAnalyses, type CallAnalysisRecord } from "./load-analyses";
import {
  DASHBOARD_PAGE_SIZE,
  bucketForDuration,
  type DashboardData,
  type DashboardFilters,
  type DashboardRow,
  type RollupCounts,
  type TagRollup,
} from "./types";

export async function loadDashboardData(
  filters: DashboardFilters,
): Promise<DashboardData> {
  const [transcripts, analyses, salesMotionSummary] = await Promise.all([
    getTranscriptDataSource().getTranscripts(),
    readAnalyses(),
    loadSalesMotionSummary(),
  ]);

  const transcriptById = new Map(transcripts.map((t) => [t.callId, t]));
  const allRows: DashboardRow[] = analyses
    .map((entry) => buildRow(entry, transcriptById))
    .filter((row): row is DashboardRow => row !== null);

  const rollups = computeRollups(allRows);
  const filteredRows = applyFilters(allRows, filters);
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / DASHBOARD_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const start = (page - 1) * DASHBOARD_PAGE_SIZE;
  const pagedRows = filteredRows.slice(start, start + DASHBOARD_PAGE_SIZE);

  return {
    filters: { ...filters, page },
    rollups,
    salesMotionSummary,
    page: {
      rows: pagedRows,
      total,
      page,
      pageSize: DASHBOARD_PAGE_SIZE,
      totalPages,
    },
    filterOptions: collectFilterOptions(allRows),
  };
}

function buildRow(
  entry: CallAnalysisRecord,
  transcriptById: Map<string, CallTranscript>,
): DashboardRow | null {
  const call = transcriptById.get(entry.callId);
  if (!call) return null;
  return {
    call,
    analysis: entry.analysis,
    analyzedAt: entry.analyzedAt,
  };
}

function applyFilters(
  rows: DashboardRow[],
  filters: DashboardFilters,
): DashboardRow[] {
  return rows.filter((row) => {
    if (filters.outcome && row.call.callOutcome !== filters.outcome)
      return false;
    if (filters.rep && row.call.repId !== filters.rep) return false;
    if (filters.cuisine && row.call.cuisineType !== filters.cuisine)
      return false;
    if (
      filters.restaurantType &&
      row.call.restaurantType !== filters.restaurantType
    )
      return false;
    if (
      filters.duration &&
      bucketForDuration(row.call.callDurationMin) !== filters.duration
    )
      return false;
    if (filters.tag) {
      const { good, bad } = row.analysis.tags;
      if (filters.polarity === "good") {
        if (!good.includes(filters.tag)) return false;
      } else if (filters.polarity === "bad") {
        if (!bad.includes(filters.tag)) return false;
      } else {
        if (!good.includes(filters.tag) && !bad.includes(filters.tag))
          return false;
      }
    }
    return true;
  });
}

function computeRollups(rows: DashboardRow[]): RollupCounts {
  const totalCalls = rows.length;
  let bookedCalls = 0;
  let durationSum = 0;
  const goodCounts = newTagCounter();
  const badCounts = newTagCounter();

  for (const row of rows) {
    if (isBooked(row.call.callOutcome)) bookedCalls += 1;
    durationSum += row.call.callDurationMin;
    for (const tag of row.analysis.tags.good)
      goodCounts[tag] = (goodCounts[tag] ?? 0) + 1;
    for (const tag of row.analysis.tags.bad)
      badCounts[tag] = (badCounts[tag] ?? 0) + 1;
  }

  return {
    totalCalls,
    bookedCalls,
    bookingRate: totalCalls === 0 ? 0 : bookedCalls / totalCalls,
    avgDurationMin: totalCalls === 0 ? 0 : durationSum / totalCalls,
    good: rankTopTags(goodCounts),
    bad: rankTopTags(badCounts),
  };
}

function newTagCounter(): Partial<Record<TrendTag, number>> {
  const init: Partial<Record<TrendTag, number>> = {};
  for (const tag of TREND_TAGS) init[tag] = 0;
  return init;
}

function rankTopTags(
  counts: Partial<Record<TrendTag, number>>,
  limit = 8,
): TagRollup[] {
  return (Object.entries(counts) as Array<[TrendTag, number]>)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

function isBooked(outcome: string): boolean {
  return outcome.toLowerCase().includes("demo");
}

function collectFilterOptions(rows: DashboardRow[]) {
  const outcomes = new Set<string>();
  const reps = new Set<string>();
  const cuisines = new Set<string>();
  const restaurantTypes = new Set<string>();
  for (const row of rows) {
    outcomes.add(row.call.callOutcome);
    reps.add(row.call.repId);
    cuisines.add(row.call.cuisineType);
    restaurantTypes.add(row.call.restaurantType);
  }
  return {
    outcomes: Array.from(outcomes).sort(),
    reps: Array.from(reps).sort(),
    cuisines: Array.from(cuisines).sort(),
    restaurantTypes: Array.from(restaurantTypes).sort(),
  };
}
