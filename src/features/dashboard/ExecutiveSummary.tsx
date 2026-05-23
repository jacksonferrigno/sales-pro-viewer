"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import type {
  SalesMotionSignal,
  SalesMotionSummary,
} from "@/server/sales-summary/summary-schema";

import styles from "./dashboard.module.css";

export function ExecutiveSummary({
  summary,
}: {
  summary: SalesMotionSummary | null;
}) {
  const [hoveredCallId, setHoveredCallId] = useState<string | null>(null);

  const onHoverCall = useCallback((id: string | null) => {
    setHoveredCallId(id);
  }, []);

  if (!summary) return null;

  return (
    <section className={styles.exec} aria-label="Executive summary">
      <div className={styles.execInner}>
        <header className={styles.execHero}>
          <div className={styles.execEyebrow}>Executive summary</div>
          <h2 className={styles.execHeadline}>{summary.headline}</h2>
          <p className={styles.execBody}>{summary.tldr.trim()}</p>
        </header>

        {summary.signals.length > 0 ? (
          <>
            <div className={styles.execRule} />
            <ul className={styles.execInsightList}>
              {summary.signals.map((signal) => (
                <InsightRow
                  key={`${signal.direction}-${signal.title}`}
                  signal={signal}
                  hoveredCallId={hoveredCallId}
                  onHoverCall={onHoverCall}
                />
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

function InsightRow({
  signal,
  hoveredCallId,
  onHoverCall,
}: {
  signal: SalesMotionSignal;
  hoveredCallId: string | null;
  onHoverCall: (id: string | null) => void;
}) {
  const callIds = uniqueIds(signal.exampleCallIds);
  const highlight = hoveredCallId !== null && callIds.includes(hoveredCallId);
  const tag = signal.direction === "helps" ? "Lift" : "Drag";

  return (
    <li
      className={`${styles.execInsightRow} ${highlight ? styles.execCardHighlight : ""}`}
      data-call-refs={callIds.join(" ")}
    >
      <span
        className={
          signal.direction === "helps"
            ? styles.execInsightTagLift
            : styles.execInsightTagDrag
        }
      >
        {tag}
      </span>
      <div className={styles.execInsightMain}>
        <span className={styles.execInsightTitle}>{signal.title}</span>
        <p className={styles.execInsightText}>{signal.insight}</p>
      </div>
      {callIds.length > 0 ? (
        <SupportingCallsDisclosure
          callIds={callIds}
          hoveredCallId={hoveredCallId}
          onHoverCall={onHoverCall}
        />
      ) : null}
    </li>
  );
}

function SupportingCallsDisclosure({
  callIds,
  hoveredCallId,
  onHoverCall,
}: {
  callIds: string[];
  hoveredCallId: string | null;
  onHoverCall: (id: string | null) => void;
}) {
  return (
    <details className={styles.execCallsDetails}>
      <summary
        className={styles.execCallsSummary}
        title="See example calls"
        aria-label={`${callIds.length} example calls`}
      >
        <span className={styles.execCallsSummaryChevron} aria-hidden>
          ▼
        </span>
      </summary>
      <div className={styles.execCallsPanel}>
        {callIds.map((callId) => (
          <ExecCallLink
            key={callId}
            callId={callId}
            hoveredCallId={hoveredCallId}
            onHoverCall={onHoverCall}
          />
        ))}
      </div>
    </details>
  );
}

function ExecCallLink({
  callId,
  hoveredCallId,
  onHoverCall,
}: {
  callId: string;
  hoveredCallId: string | null;
  onHoverCall: (id: string | null) => void;
}) {
  const active = hoveredCallId === callId;
  return (
    <Link
      className={`${styles.execCallPill} ${active ? styles.execCallPillActive : ""}`}
      href={`/calls/${encodeURIComponent(callId)}`}
      aria-label={`Open call ${callId}`}
      onMouseEnter={() => onHoverCall(callId)}
      onMouseLeave={() => onHoverCall(null)}
      onFocus={() => onHoverCall(callId)}
      onBlur={() => onHoverCall(null)}
    >
      {callId}
    </Link>
  );
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
