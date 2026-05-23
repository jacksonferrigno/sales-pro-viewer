import "server-only";

import appConfig from "@/config/app.config";
import { CsvTranscriptDataSource } from "./csv";
import type { TranscriptDataSource } from "./types";

export type { CallTranscript, TranscriptDataSource } from "./types";

export function getTranscriptDataSource(): TranscriptDataSource {
  return new CsvTranscriptDataSource(appConfig().transcripts.csvPath);
}
