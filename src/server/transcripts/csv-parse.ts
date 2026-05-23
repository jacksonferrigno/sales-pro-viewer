import fs from "node:fs/promises";
import path from "node:path";

import type { CallTranscript } from "./types";

export type TranscriptCsvRow = {
  call_id: string;
  transcript: string;
  call_duration_min: string;
  call_outcome: string;
  rep_id: string;
  rep_tenure: string;
  cuisine_type: string;
  restaurant_type: string;
  num_locations: string;
  _LOADED_AT: string;
  _LOADED_BY: string;
};

export const DEFAULT_TRANSCRIPTS_PATH = path.join(
  process.cwd(),
  "data",
  "transcripts.csv",
);

export async function readTranscriptCsvFile(
  filePath = DEFAULT_TRANSCRIPTS_PATH,
): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export function parseTranscriptCsv(csv: string): TranscriptCsvRow[] {
  const [headerLine, ...recordLines] = splitCsvRecords(csv.trim());
  if (!headerLine) {
    return [];
  }

  const headers = parseCsvRecord(headerLine);

  return recordLines.map((line) => {
    const values = parseCsvRecord(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ) as TranscriptCsvRow;
  });
}

export function mapCsvRowToTranscript(row: TranscriptCsvRow): CallTranscript {
  return {
    callId: row.call_id,
    transcript: row.transcript,
    callDurationMin: Number(row.call_duration_min),
    callOutcome: row.call_outcome,
    repId: row.rep_id,
    repTenure: row.rep_tenure,
    cuisineType: row.cuisine_type,
    restaurantType: row.restaurant_type,
    numLocations: Number(row.num_locations),
    loadedAt: row._LOADED_AT,
    loadedBy: row._LOADED_BY,
  };
}

function splitCsvRecords(csv: string): string[] {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && next === '"') {
      current += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === "\n" && !inQuotes) {
      records.push(current.replace(/\r$/, ""));
      current = "";
      continue;
    }

    current += char;
  }

  if (current) {
    records.push(current.replace(/\r$/, ""));
  }

  return records;
}

function parseCsvRecord(record: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < record.length; index += 1) {
    const char = record[index];
    const next = record[index + 1];

    if (char === '"' && next === '"') {
      current += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}
