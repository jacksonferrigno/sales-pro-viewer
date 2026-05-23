import type { RestaurantPrepRecord } from "@/lib/restaurant-sales-prep";

export type RestaurantPrepPageSlice = {
  rows: RestaurantPrepRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
