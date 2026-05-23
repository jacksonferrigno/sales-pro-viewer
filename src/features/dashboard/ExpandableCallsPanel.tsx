"use client";

import { useCallback, useId, useState, type ReactNode } from "react";

import styles from "./dashboard.module.css";

export function ExpandableCallsPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  return (
    <div className={styles.callsPanel}>
      <button
        type="button"
        className={styles.callsPanelToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className={styles.callsPanelChevronRing} aria-hidden>
          <span
            className={`${styles.callsPanelChevron} ${open ? styles.callsPanelChevronOpen : ""}`}
          >
            ↓
          </span>
        </span>
        <span className={styles.callsPanelToggleText}>
          {open
            ? "Hide filters and call log"
            : "To see all the calls, click here"}
        </span>
      </button>

      <div id={panelId} className={styles.callsPanelBody} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
