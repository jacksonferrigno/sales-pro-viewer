"use client";

import type { ReactNode } from "react";

import styles from "./dashboard.module.css";
import { AppTabs } from "./AppTabs";
import { BrandLogo } from "./BrandLogo";

export function NavBar({
  productLabel = "Sales intelligence",
  scopeLabel,
  trailing,
}: {
  productLabel?: string;
  scopeLabel?: string;
  trailing?: ReactNode;
} = {}) {
  const trailingContent =
    trailing ??
    (scopeLabel ? <span className={styles.scope}>{scopeLabel}</span> : null);

  return (
    <>
      <div className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandLogoWrap} aria-label="ServeLine">
            <BrandLogo className={styles.brandLogo} />
          </span>
          <span className={styles.brandDivider} aria-hidden />
          <span className={styles.brandProduct}>{productLabel}</span>
        </div>
        {trailingContent ? (
          <div className={styles.navTrailing}>{trailingContent}</div>
        ) : null}
      </div>
      <AppTabs />
    </>
  );
}
