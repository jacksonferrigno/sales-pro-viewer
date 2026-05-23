import "server-only";

import type { ModelCallAnalysis } from "@/server/analysis/call-analysis-schema";
import { transcriptToModelInput } from "@/server/analysis/call-input";
import type { CallTranscript } from "@/server/transcripts/types";

const CHAT_INSTRUCTIONS = `You are a sales coaching assistant for ServeLine, chatting with a sales manager about ONE call.

- Answer the user's question directly. Be concise. Don't dump a full analysis unless asked.
- Use the line-numbered transcript below as the source of truth. The analysis snapshot is themes only; if it conflicts with the transcript, trust the transcript.
- If something isn't in the transcript, say so instead of guessing.

When you state something that happened on the call, cite the transcript inline using exactly this format:

- [claim text](line:N)
- [claim text](line:N-M)
- [claim text](line:N-M,42,50-52)

Use \`line:\` (singular). The bracket text must be the claim itself, not "evidence" or "source". Line numbers refer to the line-numbered transcript at the end.

Important style rule for claims:
- Keep claim text as a short synthesis in your own words.
- Do NOT paste long verbatim transcript quotes in the claim text.
- The citation is where evidence lives; the sentence should stay analytical.

Respond as plain chat text (short paragraphs or bullets are fine). Do not return JSON.`;

export function buildCallChatSystemContent(
  call: CallTranscript,
  analysis: ModelCallAnalysis,
): string {
  const input = transcriptToModelInput(call);
  const snapshot = {
    takeaway: analysis.takeaway,
    summary: analysis.summary,
    strengths: analysis.strengths,
    risks: analysis.risks,
    buyerSignals: analysis.buyerSignals,
    coachingOpportunity: analysis.coachingOpportunity,
    tags: analysis.tags,
  };

  return `${CHAT_INSTRUCTIONS}

# Call metadata
${JSON.stringify({ callId: input.callId, ...input.metadata }, null, 2)}

# Analysis snapshot
${JSON.stringify(snapshot, null, 2)}

# Line-numbered transcript
${input.lineNumberedTranscript}`;
}
