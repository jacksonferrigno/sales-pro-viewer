import { notFound } from "next/navigation";

import { RestaurantPrepDetail } from "@/features/restaurants-prep/RestaurantPrepDetail";
import { loadRestaurantPrepById } from "@/server/restaurants-prep/data";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const row = await loadRestaurantPrepById(restaurantId);
  if (!row) notFound();
  return <RestaurantPrepDetail row={row} />;
}
