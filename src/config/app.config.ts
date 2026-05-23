import path from "node:path";

export type AppConfig = {
  port: number;
  nodeEnv: string;
  openai: {
    apiKey: string;
    model: string;
  };
  transcripts: {
    csvPath: string;
    callAnalysesNdjsonPath: string;
  };
};

/**
 * Single factory for env-backed config. Call after `dotenv` loads in scripts/tests.
 * (Reads `process.env` at invocation time, not at import time.)
 */
const appConfig = (): AppConfig => {
  const cwd = process.cwd();

  return {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini",
    },
    transcripts: {
      csvPath:
        process.env.TRANSCRIPTS_CSV_PATH?.trim() ||
        path.join(cwd, "data", "transcripts.csv"),
      callAnalysesNdjsonPath:
        process.env.CALL_ANALYSES_OUT?.trim() ||
        path.join(cwd, "data", "call-analyses.ndjson"),
    },
  };
};

export default appConfig;
