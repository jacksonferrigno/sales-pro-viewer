import { Dashboard } from "@/features/dashboard/Dashboard";
import { parseDashboardFilters } from "@/features/dashboard/search-params";
import { loadDashboardData } from "@/server/dashboard/load-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseDashboardFilters(params);
  const data = await loadDashboardData(filters);
  return <Dashboard data={data} />;
}
