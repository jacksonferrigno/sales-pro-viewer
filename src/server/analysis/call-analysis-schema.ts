import type { CallTranscript } from "@/server/transcripts/types";

import type { TrendTag } from "./trend-tags";
import { TREND_TAGS } from "./trend-tags";

/** Parsed model output (structured JSON). */
export type ModelCallAnalysis = {
  summary: string;
  strengths: string[];
  risks: string[];
  buyerSignals: string[];
  coachingOpportunity: string;
  takeaway: string;
  tags: {
    good: TrendTag[];
    bad: TrendTag[];
  };
};

/** Joined from transcripts CSV — optional until backfilled (see scripts/append_call_metadata.py). */
export type CallAnalysisMetadata = {
  outcome: string;
  repId: string;
  repTenure: string;
  cuisineType: string;
  restaurantType: string;
  numLocations: number;
  callDurationMin: number;
};

/**
 * One logical row after analysis completes.
 * NDJSON today = dev / export; production would persist the same columns in a database table.
 */
export type CallAnalysisNdjsonRecord = {
  call_id: string;
  analyzed_at: string;
  model: string;
  prompt_version: string;
  analysis: ModelCallAnalysis;
  metadata?: CallAnalysisMetadata;
};

/** Build persisted `metadata` from a transcript row (same fields as summaries expect). */
export function callAnalysisMetadataFromTranscript(
  t: CallTranscript,
): CallAnalysisMetadata {
  return {
    outcome: t.callOutcome,
    repId: t.repId,
    repTenure: t.repTenure,
    cuisineType: t.cuisineType,
    restaurantType: t.restaurantType,
    numLocations: t.numLocations,
    callDurationMin: t.callDurationMin,
  };
}

const trendTagItems = {
  type: "string",
  enum: [...TREND_TAGS],
} as const;

/** OpenAI Chat Completions `response_format.json_schema.schema` (strict). */
export const CALL_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    buyerSignals: { type: "array", items: { type: "string" } },
    coachingOpportunity: { type: "string" },
    takeaway: { type: "string" },
    tags: {
      type: "object",
      properties: {
        good: { type: "array", items: trendTagItems },
        bad: { type: "array", items: trendTagItems },
      },
      required: ["good", "bad"],
      additionalProperties: false,
    },
  },
  required: [
    "summary",
    "strengths",
    "risks",
    "buyerSignals",
    "coachingOpportunity",
    "takeaway",
    "tags",
  ],
  additionalProperties: false,
} as const;
