import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { SalesMotionSummary } from "./summary-schema";

type SalesMotionSummaryFile = {
  summary?: SalesMotionSummary;
};

const DEFAULT_SALES_MOTION_SUMMARY_PATH = path.join(
  process.cwd(),
  "data",
  "sales-motion-summary.json",
);

function isSalesMotionSummary(value: unknown): value is SalesMotionSummary {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.headline === "string" &&
    typeof s.tldr === "string" &&
    Array.isArray(s.signals)
  );
}

export async function loadSalesMotionSummary(): Promise<SalesMotionSummary | null> {
  let raw: string;
  try {
    raw = await fs.readFile(DEFAULT_SALES_MOTION_SUMMARY_PATH, "utf8");
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as
      | SalesMotionSummaryFile
      | SalesMotionSummary;
    if (parsed && "summary" in parsed && isSalesMotionSummary(parsed.summary)) {
      return parsed.summary;
    }
    if (isSalesMotionSummary(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
