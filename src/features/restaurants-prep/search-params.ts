type RawSearchParams = Record<string, string | string[] | undefined>;

export type RestaurantsPrepFilters = {
  q?: string;
  page: number;
};

export function parseRestaurantsPrepParams(
  searchParams: RawSearchParams,
): RestaurantsPrepFilters {
  return {
    q: stringParam(searchParams.q),
    page: pageParam(searchParams.page),
  };
}

export function buildRestaurantsPrepHref(
  filters: Partial<RestaurantsPrepFilters>,
): string {
  const params = new URLSearchParams();
  if (filters.q && filters.q.length > 0) params.set("q", filters.q);
  if (filters.page !== undefined && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const qs = params.toString();
  return qs ? `/restaurants?${qs}` : "/restaurants";
}

function stringParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function pageParam(value: string | string[] | undefined): number {
  const raw = stringParam(value);
  const n = raw ? Number(raw) : 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}
