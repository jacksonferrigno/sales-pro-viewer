"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./dashboard.module.css";

export function AppTabs() {
  const pathname = usePathname();
  const onRestaurants =
    pathname === "/restaurants" || pathname.startsWith("/restaurants/");

  return (
    <div className={styles.appTabs} role="tablist" aria-label="Primary">
      <Link
        href="/"
        className={`${styles.appTab} ${!onRestaurants ? styles.appTabActive : ""}`}
        role="tab"
        aria-selected={!onRestaurants}
        aria-current={!onRestaurants ? "page" : undefined}
      >
        Transcripts
      </Link>
      <Link
        href="/restaurants"
        className={`${styles.appTab} ${onRestaurants ? styles.appTabActive : ""}`}
        role="tab"
        aria-selected={onRestaurants}
        aria-current={onRestaurants ? "page" : undefined}
      >
        Restaurants
      </Link>
    </div>
  );
}
