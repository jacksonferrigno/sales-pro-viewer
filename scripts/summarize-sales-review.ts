import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

import OpenAI from "openai";

import appConfig from "../src/config/app.config";
import {
  buildPhraseProfileSummaryInput,
  type PhraseLiftProfile,
} from "../src/server/sales-summary/phrase-profile-input";
import {
  buildSalesMotionSummaryUserMessage,
  SALES_MOTION_SUMMARY_PROMPT_VERSION,
  salesMotionSummarySystemPrompt,
} from "../src/server/sales-summary/prompt";
import {
  SALES_MOTION_SUMMARY_JSON_SCHEMA,
  type SalesMotionSummary,
} from "../src/server/sales-summary/summary-schema";

const rootDir = process.cwd();
const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const envPath = path.join(rootDir, file);
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

const DEFAULT_PHRASE_PROFILE_PATH = path.join(
  rootDir,
  "data",
  "phrase-lift-profile.json",
);

function readOutputPath(): string {
  const idx = process.argv.indexOf("--out");
  const raw = idx === -1 ? undefined : process.argv[idx + 1];
  return raw?.trim() || path.join(rootDir, "data", "sales-motion-summary.json");
}

function readPhraseProfilePath(): string {
  const idx = process.argv.indexOf("--phrase-profile");
  const raw = idx === -1 ? undefined : process.argv[idx + 1];
  return raw?.trim() || DEFAULT_PHRASE_PROFILE_PATH;
}

async function readPhraseProfile(filePath: string): Promise<PhraseLiftProfile> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as PhraseLiftProfile;
}

async function summarizeSalesMotion(
  client: OpenAI,
  model: string,
  inputJson: string,
): Promise<SalesMotionSummary> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: salesMotionSummarySystemPrompt },
      {
        role: "user",
        content: buildSalesMotionSummaryUserMessage(inputJson),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sales_motion_summary",
        strict: true,
        schema: SALES_MOTION_SUMMARY_JSON_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No completion content for sales motion summary");
  }

  return JSON.parse(content) as SalesMotionSummary;
}

async function main(): Promise<void> {
  const cfg = appConfig();
  const apiKey = cfg.openai.apiKey.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set (.env.local or .env)");
  }

  const outPath = readOutputPath();
  const phraseProfilePath = readPhraseProfilePath();
  const profile = await readPhraseProfile(phraseProfilePath);
  const input = buildPhraseProfileSummaryInput(profile);

  if (input.clusters.length === 0) {
    throw new Error(
      "Phrase profile has no discoveredLanguageClusters — run npm run phrase:profile first",
    );
  }

  const client = new OpenAI({ apiKey });
  const summary = await summarizeSalesMotion(
    client,
    cfg.openai.model,
    JSON.stringify(input),
  );
  const output = {
    generated_at: new Date().toISOString(),
    model: cfg.openai.model,
    summary_prompt_version: SALES_MOTION_SUMMARY_PROMPT_VERSION,
    source: {
      evidenceType: "phrase_lift_profile",
      phraseProfileGeneratedAt: profile.generatedAt,
      phraseProfilePath: path.relative(rootDir, phraseProfilePath),
      totalCalls: profile.baseline.totalCalls,
      bookingRate: profile.baseline.bookingRate,
      modelRocAuc: profile.model.crossValidation.rocAuc,
    },
    summary,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Wrote sales motion brief (${input.clusters.length} signals) to ${path.relative(rootDir, outPath)}`,
  );
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
