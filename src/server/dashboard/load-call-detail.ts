import "server-only";

import { getTranscriptDataSource } from "@/server/transcripts";

import { readAnalyses } from "./load-analyses";
import type { DashboardRow } from "./types";

export async function loadCallDetail(
  callId: string,
): Promise<DashboardRow | null> {
  const [transcripts, analyses] = await Promise.all([
    getTranscriptDataSource().getTranscripts(),
    readAnalyses(),
  ]);

  const call = transcripts.find((t) => t.callId === callId);
  if (!call) return null;

  const record = analyses.find((a) => a.callId === callId);
  if (!record) return null;

  return {
    call,
    analysis: record.analysis,
    analyzedAt: record.analyzedAt,
  };
}
