"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { RichSegment } from "@/lib/analysis-rich-text";

import styles from "./call-detail.module.css";

export function CitationRichText({ segments }: { segments: RichSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.text}</span>;
        }
        const bare: boolean = seg.bare === true;
        return <Cite key={i} label={seg.label} lines={seg.lines} bare={bare} />;
      })}
    </>
  );
}

const POPOVER_MAX_WIDTH = 420;
const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

function Cite({
  label,
  lines,
  bare,
}: {
  label: string;
  lines: { num: number; text: string }[];
  bare?: boolean;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const citeId = `cite-${uid}`;
  const triggerClass = bare
    ? `${styles.citeTrigger} ${styles.citeTriggerBare}`
    : styles.citeTrigger;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const place = () => {
      const t = trigger.getBoundingClientRect();
      const p = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = t.left + t.width / 2 - p.width / 2;
      left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(left, vw - p.width - VIEWPORT_MARGIN),
      );

      const above = t.top - POPOVER_GAP - p.height;
      const below = t.bottom + POPOVER_GAP;
      const top =
        above >= VIEWPORT_MARGIN || t.top > vh - t.bottom ? above : below;

      setPos({ top: Math.max(VIEWPORT_MARGIN, top), left });
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return (
    <span className={styles.citeWrap}>
      <span
        ref={triggerRef}
        id={citeId}
        className={triggerClass}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-label={
          bare ? "Show transcript lines for this reference" : undefined
        }
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </span>
      {mounted && open
        ? createPortal(
            <div
              ref={popoverRef}
              className={styles.citePopover}
              role="tooltip"
              style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                maxWidth: `min(${POPOVER_MAX_WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
                visibility: pos ? "visible" : "hidden",
              }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <div className={styles.citePopoverInner}>
                {lines.map((line) => (
                  <div key={line.num} className={styles.citePopoverRow}>
                    <span className={styles.citePopoverNum}>{line.num}</span>
                    <span className={styles.citePopoverText}>{line.text}</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
