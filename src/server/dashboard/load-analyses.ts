import "server-only";

import fs from "node:fs/promises";

import appConfig from "@/config/app.config";
import type {
  CallAnalysisNdjsonRecord,
  ModelCallAnalysis,
} from "@/server/analysis/call-analysis-schema";

export type CallAnalysisRecord = {
  callId: string;
  analyzedAt: string;
  model: string;
  promptVersion: string;
  analysis: ModelCallAnalysis;
};

/**
 * Reads the local NDJSON of analyses. This is interim storage; production
 * reads come from a database query joined on call_id, not a file scan.
 */
export async function readAnalyses(): Promise<CallAnalysisRecord[]> {
  const path = appConfig().transcripts.callAnalysesNdjsonPath;
  let raw: string;
  try {
    raw = await fs.readFile(path, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseLine);
}

function parseLine(line: string): CallAnalysisRecord {
  const row = JSON.parse(line) as CallAnalysisNdjsonRecord;
  return {
    callId: row.call_id,
    analyzedAt: row.analyzed_at,
    model: row.model,
    promptVersion: row.prompt_version,
    analysis: row.analysis,
  };
}
