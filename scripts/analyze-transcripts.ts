import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

import OpenAI from "openai";

import appConfig from "../src/config/app.config";
import {
  CALL_ANALYSIS_JSON_SCHEMA,
  callAnalysisMetadataFromTranscript,
  type CallAnalysisNdjsonRecord,
  type ModelCallAnalysis,
} from "../src/server/analysis/call-analysis-schema";
import { transcriptToModelInput } from "../src/server/analysis/call-input";
import {
  PROMPT_VERSION,
  buildUserMessage,
  systemPrompt,
} from "../src/server/analysis/prompt";
import {
  mapCsvRowToTranscript,
  parseTranscriptCsv,
  readTranscriptCsvFile,
} from "../src/server/transcripts/csv-parse";
import type { CallTranscript } from "../src/server/transcripts/types";

/**
 * Batch worker: writes NDJSON for local iteration only.
 * Production: same {@link CallAnalysisNdjsonRecord} shape → DB row + per-bucket rollup updates on insert (no full-table scans for dashboard counts).
 */
const rootDir = process.cwd();
const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const envPath = path.join(rootDir, file);
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

function readLimit(): number {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1) {
    return Number.POSITIVE_INFINITY;
  }
  const raw = process.argv[idx + 1];
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("Invalid --limit: use e.g. --limit 10");
  }
  return Math.floor(n);
}

async function analyzeTranscript(
  client: OpenAI,
  model: string,
  transcript: CallTranscript,
): Promise<ModelCallAnalysis> {
  const input = transcriptToModelInput(transcript);
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserMessage(JSON.stringify(input)) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "call_analysis",
        strict: true,
        schema: CALL_ANALYSIS_JSON_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No completion content for call_id=${transcript.callId}`);
  }

  return JSON.parse(content) as ModelCallAnalysis;
}

async function main(): Promise<void> {
  const cfg = appConfig();

  const apiKey = cfg.openai.apiKey.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set (.env.local or .env)");
  }

  const limit = readLimit();
  const { model } = cfg.openai;
  const outPath = cfg.transcripts.callAnalysesNdjsonPath;
  const csvPath = cfg.transcripts.csvPath;

  const csvText = await readTranscriptCsvFile(csvPath);
  const rows = parseTranscriptCsv(csvText).map(mapCsvRowToTranscript);
  const selected = Number.isFinite(limit) ? rows.slice(0, limit) : rows;

  const client = new OpenAI({ apiKey });

  const lines: string[] = [];

  for (const transcript of selected) {
    const analysis = await analyzeTranscript(client, model, transcript);
    const row: CallAnalysisNdjsonRecord = {
      call_id: transcript.callId,
      analyzed_at: new Date().toISOString(),
      model,
      prompt_version: PROMPT_VERSION,
      metadata: callAnalysisMetadataFromTranscript(transcript),
      analysis,
    };
    lines.push(JSON.stringify(row));
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${lines.join("\n")}\n`, "utf8");

  console.log(
    `Wrote ${lines.length} row(s) to ${path.relative(rootDir, outPath)}`,
  );
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
