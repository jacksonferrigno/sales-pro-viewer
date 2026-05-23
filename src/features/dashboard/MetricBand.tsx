import type { RollupCounts } from "@/server/dashboard/types";

import styles from "./dashboard.module.css";
import { formatCount, formatPercent } from "./format";

export function MetricBand({ rollups }: { rollups: RollupCounts }) {
  return (
    <div className={styles.metrics}>
      <Metric label="Calls analyzed" value={formatCount(rollups.totalCalls)} />
      <Metric
        label="Demos booked"
        value={`${formatCount(rollups.bookedCalls)} · ${formatPercent(rollups.bookingRate)}`}
      />
      <Metric
        label="Avg duration"
        value={`${Math.round(rollups.avgDurationMin)}m`}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  );
}
