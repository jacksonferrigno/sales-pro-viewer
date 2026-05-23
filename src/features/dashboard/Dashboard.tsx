import type { DashboardData } from "@/server/dashboard/types";

import { CallLog } from "./CallLog";
import { ExpandableCallsPanel } from "./ExpandableCallsPanel";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { FilterBar } from "./FilterBar";
import { MetricBand } from "./MetricBand";
import { NavBar } from "./NavBar";
import { WhatToLookAt } from "./WhatToLookAt";
import styles from "./dashboard.module.css";

export function Dashboard({ data }: { data: DashboardData }) {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <NavBar />
        <ExecutiveSummary summary={data.salesMotionSummary} />
        <MetricBand rollups={data.rollups} />
        <WhatToLookAt rollups={data.rollups} />
        <ExpandableCallsPanel>
          <FilterBar filters={data.filters} options={data.filterOptions} />
          <CallLog page={data.page} filters={data.filters} />
        </ExpandableCallsPanel>
      </div>
    </div>
  );
}
