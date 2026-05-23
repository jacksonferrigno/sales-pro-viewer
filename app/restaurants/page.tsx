import { RestaurantsPrepDashboard } from "@/features/restaurants-prep/RestaurantsPrepDashboard";
import { parseRestaurantsPrepParams } from "@/features/restaurants-prep/search-params";
import { loadRestaurantsPrepData } from "@/server/restaurants-prep/data";
import { DASHBOARD_PAGE_SIZE } from "@/server/dashboard/types";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { q, page: pageFromQuery } = parseRestaurantsPrepParams(params);
  const allRows = await loadRestaurantsPrepData();
  const lowered = (q ?? "").toLowerCase();
  const filtered = lowered
    ? allRows.filter((row) => {
        const name = row.name.toLowerCase();
        const website = row.websiteUrl.toLowerCase();
        return name.includes(lowered) || website.includes(lowered);
      })
    : allRows;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / DASHBOARD_PAGE_SIZE));
  const page = Math.min(Math.max(1, pageFromQuery), totalPages);
  const start = (page - 1) * DASHBOARD_PAGE_SIZE;
  const rows = filtered.slice(start, start + DASHBOARD_PAGE_SIZE);

  return (
    <RestaurantsPrepDashboard
      page={{
        rows,
        total,
        page,
        pageSize: DASHBOARD_PAGE_SIZE,
        totalPages,
      }}
      filters={{ q, page }}
    />
  );
}
