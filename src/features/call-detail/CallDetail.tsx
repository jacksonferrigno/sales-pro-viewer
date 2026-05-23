import Link from "next/link";

import { toRichSegments, transcriptToLines } from "@/lib/analysis-rich-text";
import type { DashboardRow } from "@/server/dashboard/types";

import { CallDetailChat } from "./CallDetailChat";
import { CitationRichText } from "./CitationRichText";
import styles from "./call-detail.module.css";
import { formatDuration } from "../dashboard/format";

function TagRow({ row }: { row: DashboardRow }) {
  const good = [...new Set(row.analysis.tags.good)];
  const bad = [...new Set(row.analysis.tags.bad)];
  if (good.length === 0 && bad.length === 0) {
    return <p className={styles.tagsRowMuted}>—</p>;
  }
  return (
    <div className={styles.tagsRow}>
      {good.map((t) => (
        <span key={`g-${t}`} className={styles.tagChipGood}>
          {t}
        </span>
      ))}
      {bad.map((t) => (
        <span key={`b-${t}`} className={styles.tagChipBad}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function CallDetail({ row }: { row: DashboardRow }) {
  const { call, analysis } = row;
  const lines = transcriptToLines(call.transcript);
  const summarySegs = toRichSegments(analysis.summary, lines);

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <div className={styles.main}>
          <div className={styles.topBar}>
            <Link href="/">← Dashboard</Link>
            <span className={styles.topBarSep}>/</span>
            <span>{call.callId}</span>
          </div>

          <div className={styles.body}>
            <div className={styles.headerBlock}>
              <h1 className={styles.headline}>
                {call.cuisineType} · {call.restaurantType}
              </h1>
              <p className={styles.meta}>
                {call.callOutcome}
                {" · "}
                {call.repId}
                {" · "}
                {formatDuration(call.callDurationMin)}
              </p>
            </div>

            <p className={styles.lede}>{analysis.takeaway}</p>

            <hr className={styles.rule} />

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Summary</p>
              <p className={styles.sectionBody}>
                <CitationRichText segments={summarySegs} />
              </p>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Strengths</p>
              {analysis.strengths.length === 0 ? (
                <p className={styles.sectionBody}>—</p>
              ) : (
                <ul className={styles.list}>
                  {analysis.strengths.map((g, i) => (
                    <li key={i}>
                      <CitationRichText segments={toRichSegments(g, lines)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Risks</p>
              {analysis.risks.length === 0 ? (
                <p className={styles.sectionBody}>—</p>
              ) : (
                <ul className={styles.list}>
                  {analysis.risks.map((b, i) => (
                    <li key={i}>
                      <CitationRichText segments={toRichSegments(b, lines)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Buyer signals</p>
              {analysis.buyerSignals.length === 0 ? (
                <p className={styles.sectionBody}>—</p>
              ) : (
                <ul className={styles.list}>
                  {analysis.buyerSignals.map((signal, i) => (
                    <li key={i}>
                      <CitationRichText
                        segments={toRichSegments(signal, lines)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Coaching opportunity</p>
              <p className={styles.sectionBody}>
                <CitationRichText
                  segments={toRichSegments(analysis.coachingOpportunity, lines)}
                />
              </p>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Tags</p>
              <TagRow row={row} />
            </div>
          </div>
        </div>

        <CallDetailChat callId={call.callId} transcriptLines={lines} />
      </div>
    </div>
  );
}
