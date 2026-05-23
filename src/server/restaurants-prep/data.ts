import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { RestaurantPrepRecord } from "@/lib/restaurant-sales-prep";

export type {
  RestaurantPrepRecord,
  PlatformPresence,
} from "@/lib/restaurant-sales-prep";

const DEFAULT_RESTAURANTS_PREP_PATH = path.join(
  process.cwd(),
  "data",
  "restaurant-sales-prep-sample.ndjson",
);

function resolveRestaurantsPrepPath(): string {
  const customPath = process.env.RESTAURANT_SALES_PREP_OUT?.trim();
  return customPath || DEFAULT_RESTAURANTS_PREP_PATH;
}

export async function loadRestaurantsPrepData(): Promise<
  RestaurantPrepRecord[]
> {
  const filePath = resolveRestaurantsPrepPath();
  const raw = await fs.readFile(filePath, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as RestaurantPrepRecord[];
  }
  const rows: RestaurantPrepRecord[] = [];
  for (const line of raw.split("\n")) {
    const l = line.trim();
    if (!l) continue;
    rows.push(JSON.parse(l) as RestaurantPrepRecord);
  }
  return rows;
}

export async function loadRestaurantPrepById(
  restaurantId: string,
): Promise<RestaurantPrepRecord | null> {
  const rows = await loadRestaurantsPrepData();
  return rows.find((row) => row.restaurantId === restaurantId) ?? null;
}
