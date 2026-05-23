import Link from "next/link";

import type { DashboardFilters, DashboardPage } from "@/server/dashboard/types";

import styles from "./dashboard.module.css";
import { SignalMeter } from "./SignalMeter";
import { formatCount, formatDuration } from "./format";
import { buildDashboardHref } from "./search-params";

export function callLogResultsSummary(page: DashboardPage): {
  range: string;
  pageLine: string;
} {
  const { total, page: p, pageSize, totalPages } = page;
  const pageLine = `Page ${p} of ${totalPages}`;
  if (total === 0) {
    return { range: "0 calls", pageLine };
  }
  const start = (p - 1) * pageSize + 1;
  const end = Math.min(total, p * pageSize);
  return {
    range: `${formatCount(start)}–${formatCount(end)} of ${formatCount(total)}`,
    pageLine,
  };
}

function ResultsMeta({ page }: { page: DashboardPage }) {
  const { range, pageLine } = callLogResultsSummary(page);
  return (
    <div className={styles.resultsMeta}>
      <span className={styles.resultsMetaCompact}>
        <span>{range}</span>
        <span className={styles.resultsMetaDot} aria-hidden>
          ·
        </span>
        <span>{pageLine}</span>
      </span>
    </div>
  );
}

export function CallLog({
  page,
  filters,
}: {
  page: DashboardPage;
  filters: DashboardFilters;
}) {
  if (page.rows.length === 0) {
    return (
      <>
        <ResultsMeta page={page} />
        <div className={styles.empty}>
          No analyzed calls match these filters.
        </div>
      </>
    );
  }

  const summary = callLogResultsSummary(page);

  return (
    <>
      <ResultsMeta page={page} />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Call</th>
              <th>Rep</th>
              <th>Restaurant</th>
              <th>Duration</th>
              <th>Outcome</th>
              <th>Signals</th>
              <th>Takeaway</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => {
              const booked = row.call.callOutcome
                .toLowerCase()
                .includes("demo");
              const href = `/calls/${encodeURIComponent(row.call.callId)}`;
              return (
                <tr key={row.call.callId} className={styles.rowClickable}>
                  <td className={styles.callId}>
                    <Link
                      className={styles.rowLink}
                      href={href}
                      aria-label={`Open call ${row.call.callId}`}
                    >
                      {row.call.callId}
                    </Link>
                  </td>
                  <td>{row.call.repId}</td>
                  <td>
                    {row.call.cuisineType} · {row.call.restaurantType}
                  </td>
                  <td>{formatDuration(row.call.callDurationMin)}</td>
                  <td>
                    <span
                      className={`${styles.outcomeBadge} ${booked ? styles.booked : ""}`}
                    >
                      {row.call.callOutcome}
                    </span>
                  </td>
                  <td>
                    <SignalMeter
                      good={row.analysis.tags.good.length}
                      bad={row.analysis.tags.bad.length}
                    />
                  </td>
                  <td className={styles.takeaway}>{row.analysis.takeaway}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationInner}>
          <Link
            className={styles.pageBtn}
            href={buildDashboardHref({ ...filters, page: page.page - 1 })}
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
            href={buildDashboardHref({ ...filters, page: page.page + 1 })}
            aria-disabled={page.page >= page.totalPages}
          >
            Next →
          </Link>
        </div>
      </div>
    </>
  );
}
