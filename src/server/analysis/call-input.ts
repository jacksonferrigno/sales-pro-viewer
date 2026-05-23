import type { CallTranscript } from "@/server/transcripts/types";
import { toLineNumberedTranscript } from "@/server/transcripts/line-numbered";

/** Payload sent in the user message (matches design doc). */
export type CallModelInput = {
  callId: string;
  metadata: {
    outcome: string;
    repId: string;
    repTenure: string;
    cuisineType: string;
    restaurantType: string;
    numLocations: number;
    callDurationMin: number;
  };
  lineNumberedTranscript: string;
};

export function transcriptToModelInput(t: CallTranscript): CallModelInput {
  return {
    callId: t.callId,
    metadata: {
      outcome: t.callOutcome,
      repId: t.repId,
      repTenure: t.repTenure,
      cuisineType: t.cuisineType,
      restaurantType: t.restaurantType,
      numLocations: t.numLocations,
      callDurationMin: t.callDurationMin,
    },
    lineNumberedTranscript: toLineNumberedTranscript(t.transcript),
  };
}
