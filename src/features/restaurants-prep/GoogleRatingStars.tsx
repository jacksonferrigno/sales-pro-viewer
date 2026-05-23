import styles from "./restaurants-prep.module.css";

export function GoogleRatingStars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const pct = (clamped / 5) * 100;

  return (
    <span
      className={`${styles.stars} ${size === "md" ? styles.starsMd : ""}`}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      <span className={styles.starsBase} aria-hidden>
        ★★★★★
      </span>
      <span
        className={styles.starsFill}
        aria-hidden
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
