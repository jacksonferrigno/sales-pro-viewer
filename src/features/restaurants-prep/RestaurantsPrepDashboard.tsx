"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { RestaurantPrepRecord } from "@/lib/restaurant-sales-prep";
import { NavBar } from "@/features/dashboard/NavBar";
import { formatCount } from "@/features/dashboard/format";

import { DeliveryPlatformLogos } from "./DeliveryPlatformLogos";
import { GoogleRatingStars } from "./GoogleRatingStars";
import {
  buildRestaurantsPrepHref,
  type RestaurantsPrepFilters,
} from "./search-params";
import styles from "./restaurants-prep.module.css";
import type { RestaurantPrepPageSlice } from "./types";

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function seoTone(score: number | null): string {
  if (typeof score !== "number") return styles.seoUnknown;
  if (score >= 80) return styles.seoGood;
  if (score >= 60) return styles.seoWarn;
  return styles.seoBad;
}

function openRow(e: KeyboardEvent, navigate: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    navigate();
  }
}

function resultsSummary(p: RestaurantPrepPageSlice): {
  range: string;
  pageLine: string;
} {
  const { total, page: num, pageSize, totalPages } = p;
  const pageLine = `Page ${num} of ${totalPages}`;
  if (total === 0) {
    return { range: "0 restaurants", pageLine };
  }
  const start = (num - 1) * pageSize + 1;
  const end = Math.min(total, num * pageSize);
  return {
    range: `${formatCount(start)}–${formatCount(end)} of ${formatCount(total)}`,
    pageLine,
  };
}

export function RestaurantsPrepDashboard({
  page,
  filters,
}: {
  page: RestaurantPrepPageSlice;
  filters: RestaurantsPrepFilters;
}) {
  const router = useRouter();
  const summary = resultsSummary(page);
  const query = filters.q ?? "";

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <NavBar
          scopeLabel={`${page.total} restaurant${page.total === 1 ? "" : "s"}`}
        />

        <div className={styles.hero}>
          <form
            method="get"
            action="/restaurants"
            className={styles.searchForm}
            role="search"
          >
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search by name or website…"
              className={styles.searchInput}
              aria-label="Search restaurants"
              autoComplete="off"
            />
          </form>
        </div>

        <div className={styles.resultsMeta}>
          <span className={styles.resultsMetaCompact}>
            <span>{summary.range}</span>
            <span className={styles.resultsMetaDot} aria-hidden>
              ·
            </span>
            <span>{summary.pageLine}</span>
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Website</th>
                <th>Rating</th>
                <th className={styles.colSeo}>SEO</th>
                <th className={styles.colDelivery}>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row: RestaurantPrepRecord) => {
                const href = `/restaurants/${encodeURIComponent(row.restaurantId)}`;
                const go = () => router.push(href);

                return (
                  <tr
                    key={row.restaurantId}
                    className={styles.rowClickable}
                    onClick={go}
                    onKeyDown={(e) => openRow(e, go)}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${row.name}`}
                  >
                    <td>
                      <div className={styles.restaurantName}>{row.name}</div>
                      <div className={styles.restaurantLocation}>
                        {row.city}, {row.state}
                      </div>
                    </td>
                    <td className={styles.websiteCell}>
                      {row.websiteUrl ? (
                        <a
                          href={row.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {stripProtocol(row.websiteUrl)}
                        </a>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {typeof row.googleRating === "number" ? (
                        <span className={styles.rating}>
                          <GoogleRatingStars rating={row.googleRating} />
                          {row.googleRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.colSeo}>
                      <span
                        className={`${styles.seoPill} ${seoTone(row.seoScore)}`}
                      >
                        {row.seoScore ?? "—"}
                      </span>
                    </td>
                    <td className={styles.colDelivery}>
                      <DeliveryPlatformLogos presence={row.platformPresence} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {page.rows.length === 0 ? (
            <div className={styles.empty}>No restaurants match.</div>
          ) : null}
        </div>

        <div className={styles.pagination}>
          <div className={styles.paginationInner}>
            <Link
              className={styles.pageBtn}
              href={buildRestaurantsPrepHref({
                ...filters,
                page: page.page - 1,
              })}
              aria-disabled={page.page <= 1}
            >
              ← Prev
            </Link>
            <span className={styles.paginationDot} aria-hidden>
              ·
            </span>
            <span className={styles.paginationStats}>
              <span>{summary.range}</span>
              <span className={styles.paginationStatsDot} aria-hidden>
                ·
              </span>
              <span>{summary.pageLine}</span>
            </span>
            <span className={styles.paginationDot} aria-hidden>
              ·
            </span>
            <Link
              className={styles.pageBtn}
              href={buildRestaurantsPrepHref({
                ...filters,
                page: page.page + 1,
              })}
              aria-disabled={page.page >= page.totalPages}
            >
              Next →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
