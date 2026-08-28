import type { Restaurant } from '../types';
import styles from './ResultPage.module.css';

interface ResultPageProps {
  winner: Restaurant;
  onPlayAgain: () => void;
}

function ArrowIcon() {
  return (
    <svg className={styles.arrowIcon} viewBox="0 0 12.1244 10.5" aria-hidden="true">
      <path d="M6.06218 0L12.1244 10.5H0L6.06218 0Z" fill="black" fillOpacity="0.4" />
    </svg>
  );
}

/** Figma node 338:588 — "마무리_Lunch Time" result screen, shown once the
 * wheel has actually stopped on `winner`. No mock/placeholder content: every
 * field here comes from the real Kakao restaurant the roulette landed on. */
export function ResultPage({ winner, onPlayAgain }: ResultPageProps) {
  return (
    <div className={styles.resultScreen}>
      <div className={styles.heading}>
        <p className={styles.title}>Baro Baro ...</p>
        <p className={styles.subtitle}>결과가 마음에 드나요?</p>
      </div>

      <div className={styles.winnerBlock}>
        <span className={styles.categoryPill}>{winner.categoryLabel}</span>
        <p className={styles.winnerName}>{winner.place_name}</p>
        {winner.place_url && (
          <a className={styles.mapLink} href={winner.place_url} target="_blank" rel="noreferrer">
            카카오맵에서 보기
          </a>
        )}
      </div>

      <nav className={styles.end} aria-label="다음 동작">
        <button type="button" className={styles.endItem} onClick={onPlayAgain}>
          <ArrowIcon />
          <span>Play again</span>
        </button>
        <a className={styles.endItem} href="../pages/secret-break.html">
          <ArrowIcon />
          <span>Next Game</span>
        </a>
        <a className={styles.endItem} href="../index.html">
          <ArrowIcon />
          <span>Home</span>
        </a>
      </nav>
    </div>
  );
}
