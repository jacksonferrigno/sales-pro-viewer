import Link from "next/link";

import type { TrendTag } from "@/server/analysis/trend-tags";
import type { RollupCounts, TagRollup } from "@/server/dashboard/types";

import styles from "./dashboard.module.css";
import { buildDashboardHref } from "./search-params";

const TOP_N = 4;

export function WhatToLookAt({ rollups }: { rollups: RollupCounts }) {
  const rows = mergeTopTags(rollups.good, rollups.bad, TOP_N);

  if (rows.length === 0) return null;

  return (
    <div className={styles.lookAt}>
      <div className={styles.lookAtTitle}>What to look at</div>
      <div className={styles.lookAtRow}>
        {rows.map(({ tag, good, bad }) => {
          const total = good + bad;
          const goodPct = total === 0 ? 0 : (good / total) * 100;
          return (
            <Link
              key={tag}
              className={styles.lookAtChip}
              href={buildDashboardHref({ tag, page: 1 })}
              title={`${tag}: ${good} good, ${bad} bad`}
            >
              <div className={styles.lookAtChipHead}>
                <span className={styles.lookAtChipTag}>{tag}</span>
                <span className={styles.lookAtChipTotal}>{total}</span>
              </div>
              <div className={styles.lookAtBar}>
                <span
                  className={styles.lookAtBarGood}
                  style={{ width: `${goodPct}%` }}
                />
                <span
                  className={styles.lookAtBarBad}
                  style={{ width: `${100 - goodPct}%` }}
                />
              </div>
              <div className={styles.lookAtChipFoot}>
                <span className={styles.lookAtChipGood}>{good} good</span>
                <span className={styles.lookAtChipBad}>{bad} bad</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function mergeTopTags(
  good: TagRollup[],
  bad: TagRollup[],
  limit: number,
): { tag: TrendTag; good: number; bad: number }[] {
  const map = new Map<TrendTag, { tag: TrendTag; good: number; bad: number }>();
  for (const { tag, count } of good) {
    map.set(tag, { tag, good: count, bad: 0 });
  }
  for (const { tag, count } of bad) {
    const existing = map.get(tag);
    if (existing) existing.bad = count;
    else map.set(tag, { tag, good: 0, bad: count });
  }
  return Array.from(map.values())
    .sort((a, b) => b.good + b.bad - (a.good + a.bad))
    .slice(0, limit);
}
