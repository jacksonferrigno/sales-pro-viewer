import styles from "./dashboard.module.css";

const MAX_BLOCKS = 5;

export function SignalMeter({ good, bad }: { good: number; bad: number }) {
  if (good === 0 && bad === 0) {
    return <span className={styles.meterEmpty}>—</span>;
  }

  const goodBlocks = Math.min(good, MAX_BLOCKS);
  const badBlocks = Math.min(bad, MAX_BLOCKS);

  return (
    <span
      className={styles.meter}
      title={`${good} good, ${bad} bad signals`}
      aria-label={`${good} good signals, ${bad} bad signals`}
    >
      <span className={styles.meterSide}>
        {Array.from({ length: badBlocks }).map((_, i) => (
          <span
            key={`b-${i}`}
            className={`${styles.meterBlock} ${styles.meterBlockBad}`}
          />
        ))}
      </span>
      <span className={styles.meterDivider} />
      <span className={styles.meterSide}>
        {Array.from({ length: goodBlocks }).map((_, i) => (
          <span
            key={`g-${i}`}
            className={`${styles.meterBlock} ${styles.meterBlockGood}`}
          />
        ))}
      </span>
    </span>
  );
}
