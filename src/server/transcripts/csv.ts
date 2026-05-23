import "server-only";

import fs from "node:fs/promises";

import {
  DEFAULT_TRANSCRIPTS_PATH,
  mapCsvRowToTranscript,
  parseTranscriptCsv,
} from "./csv-parse";
import type { CallTranscript, TranscriptDataSource } from "./types";

export class CsvTranscriptDataSource implements TranscriptDataSource {
  constructor(private readonly filePath = DEFAULT_TRANSCRIPTS_PATH) {}

  async getTranscripts(): Promise<CallTranscript[]> {
    const csv = await fs.readFile(this.filePath, "utf8");
    return parseTranscriptCsv(csv).map(mapCsvRowToTranscript);
  }
}

export { mapCsvRowToTranscript, parseTranscriptCsv } from "./csv-parse";
export type { TranscriptCsvRow } from "./csv-parse";
