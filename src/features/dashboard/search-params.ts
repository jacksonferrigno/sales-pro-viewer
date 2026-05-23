import { TREND_TAGS, type TrendTag } from "@/server/analysis/trend-tags";
import type {
  DashboardFilters,
  DurationBucket,
} from "@/server/dashboard/types";

const DURATION_BUCKETS: DurationBucket[] = ["short", "medium", "long"];
const POLARITIES = ["good", "bad"] as const;

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseDashboardFilters(
  searchParams: RawSearchParams,
): DashboardFilters {
  return {
    outcome: stringParam(searchParams.outcome),
    rep: stringParam(searchParams.rep),
    cuisine: stringParam(searchParams.cuisine),
    restaurantType: stringParam(searchParams.restaurantType),
    duration: enumParam(searchParams.duration, DURATION_BUCKETS),
    tag: enumParam(searchParams.tag, TREND_TAGS as readonly TrendTag[]),
    polarity: enumParam(searchParams.polarity, POLARITIES),
    page: pageParam(searchParams.page),
  };
}

export function buildDashboardHref(filters: Partial<DashboardFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && value === 1) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function stringParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function enumParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | undefined {
  const raw = stringParam(value);
  return raw && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined;
}

function pageParam(value: string | string[] | undefined): number {
  const raw = stringParam(value);
  const n = raw ? Number(raw) : 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}
