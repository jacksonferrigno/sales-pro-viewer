import Link from "next/link";

import type { RestaurantPrepRecord } from "@/lib/restaurant-sales-prep";
import { NavBar } from "@/features/dashboard/NavBar";
import dashboardStyles from "@/features/dashboard/dashboard.module.css";

import { DeliveryPlatformLogoMark } from "./DeliveryPlatformLogos";
import styles from "./restaurants-prep.module.css";

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatBusinessType(value: string | undefined): string {
  if (!value) return "—";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLocations(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return `${value.toLocaleString()} location${value === 1 ? "" : "s"}`;
}

type PrepChecklist = {
  whatThisLikelyMeans: string;
  questionsToAsk: string[];
  whatToListenFor: string[];
  bestNextMove: string;
};

const PLATFORMS: Array<keyof RestaurantPrepRecord["platformPresence"]> = [
  "doordash",
  "ubereats",
  "grubhub",
];

type RestaurantPrepDetailRecord = Omit<RestaurantPrepRecord, "prep"> & {
  prep?: PrepChecklist | null;
  cuisineType?: string;
  businessType?: string;
  numLocations?: number | null;
};

export function RestaurantPrepDetail({
  row,
}: {
  row: RestaurantPrepDetailRecord;
}) {
  const cuisineType = row.cuisineType ?? "—";
  const businessType = formatBusinessType(row.businessType);
  const locations = formatLocations(row.numLocations);
  const prep = (row as { prep?: PrepChecklist | null }).prep ?? null;

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <NavBar
          trailing={
            <Link
              href="/restaurants"
              className={dashboardStyles.navTrailingLink}
            >
              ← All restaurants
            </Link>
          }
        />

        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderInner}>
            <div className={styles.detailIdentity}>
              <h1 className={styles.restaurantTitle}>{row.name}</h1>
              <p className={styles.locationLine}>
                {row.city}, {row.state}
                {row.websiteUrl ? (
                  <>
                    {" · "}
                    <a href={row.websiteUrl} target="_blank" rel="noreferrer">
                      {stripProtocol(row.websiteUrl)} ↗
                    </a>
                  </>
                ) : null}
              </p>
              <div className={styles.headerPlatformRow}>
                {PLATFORMS.map((p) => {
                  const data = row.platformPresence[p];
                  const mark = (
                    <DeliveryPlatformLogoMark
                      platformKey={p}
                      present={data.present}
                      layout="inline"
                    />
                  );
                  return data.present && data.evidenceUrl ? (
                    <a
                      key={p}
                      href={data.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.headerPlatformBtn}
                    >
                      {mark}
                    </a>
                  ) : (
                    <span key={p} className={styles.headerPlatformBtn}>
                      {mark}
                    </span>
                  );
                })}
              </div>
            </div>

            <dl className={styles.detailFacts}>
              <div>
                <dt>Cuisine</dt>
                <dd>{cuisineType}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{businessType}</dd>
              </div>
              <div>
                <dt>Locations</dt>
                <dd>{locations}</dd>
              </div>
              <div>
                <dt>Google rating</dt>
                <dd>
                  {row.googleRating?.toFixed(1) ?? "—"}
                  {row.googleReviewCount
                    ? ` (${row.googleReviewCount.toLocaleString()} reviews)`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Website SEO</dt>
                <dd>{row.seoScore ?? "—"}/100</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>
                  {typeof row.delivery === "boolean"
                    ? row.delivery
                      ? "Yes"
                      : "No"
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Takeout</dt>
                <dd>
                  {typeof row.takeout === "boolean"
                    ? row.takeout
                      ? "Yes"
                      : "No"
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className={styles.detailBody}>
          {prep ? (
            <div className={styles.detailGrid}>
              <div className={styles.detailGridLeft}>
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Executive summary</h2>
                  <p className={styles.cardBody}>{prep.whatThisLikelyMeans}</p>
                </section>
                <section className={`${styles.card} ${styles.cardAccent}`}>
                  <h2 className={styles.cardTitle}>Best next move</h2>
                  <p className={styles.cardBody}>{prep.bestNextMove}</p>
                </section>
              </div>
              <div className={styles.detailGridRight}>
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Questions to ask</h2>
                  <ul className={styles.cardList}>
                    {prep.questionsToAsk.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>What to listen for</h2>
                  <ul className={styles.cardList}>
                    {prep.whatToListenFor.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          ) : null}

          <section className={`${styles.card} ${styles.cardWide}`}>
            <h2 className={styles.cardTitle}>What people are saying</h2>
            <p className={styles.cardBody}>
              {row.reviewSummary ?? "No review summary available."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
