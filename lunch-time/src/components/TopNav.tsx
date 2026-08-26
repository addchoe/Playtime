import { useClock } from '../hooks/useClock';
import styles from './TopNav.module.css';

export function TopNav() {
  const time = useClock();

  return (
    <header className={styles.topNav}>
      <span className={styles.logo}>Playtime!</span>

      <div className={styles.timePill} aria-label={`현재 시각 ${time}`}>
        <span className={styles.timeLabel}>Time</span>
        <span className={styles.timeValue}>{time}</span>
      </div>

      <span className={styles.contactButton}>
        <span className={styles.contactDot} aria-hidden="true" />
        Contact
      </span>
    </header>
  );
}
