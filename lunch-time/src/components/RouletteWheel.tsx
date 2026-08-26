import type { WheelItem } from '../types';
import { segmentCenterAngleDeg } from '../utils/wheel';
import styles from './RouletteWheel.module.css';

const TICK_COUNT = 28;
const LABEL_ANCHOR_RADIUS_PCT = 31;
const SVG_RADIUS = 48;

interface RouletteWheelProps {
  items: WheelItem[];
  rotation: number;
  spinning: boolean;
  winner: WheelItem | null;
  onSpinEnd: () => void;
  onGoClick: () => void;
  goDisabled: boolean;
}

export function RouletteWheel({
  items,
  rotation,
  spinning,
  winner,
  onSpinEnd,
  onGoClick,
  goDisabled,
}: RouletteWheelProps) {
  const total = items.length;
  const step = 360 / total;
  const boundaryAngles = Array.from({ length: total }, (_, i) => -90 + i * step);
  const tickAngles = Array.from({ length: TICK_COUNT }, (_, i) => (360 / TICK_COUNT) * i);

  return (
    <div className={styles.wheelWrap}>
      <div
        className={`${styles.wheelSpin} ${spinning ? styles.spinning : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform') onSpinEnd();
        }}
      >
        <svg className={styles.wheelSvg} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={SVG_RADIUS} className={styles.outerRing} />
          {tickAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <circle
                key={angle}
                cx={50 + Math.cos(rad) * SVG_RADIUS}
                cy={50 + Math.sin(rad) * SVG_RADIUS}
                r="0.5"
                className={styles.tick}
              />
            );
          })}
          {boundaryAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1="50"
                y1="50"
                x2={50 + Math.cos(rad) * SVG_RADIUS}
                y2={50 + Math.sin(rad) * SVG_RADIUS}
                className={styles.spoke}
              />
            );
          })}
        </svg>

        <div className={styles.labels}>
          {items.map((item, index) => {
            const angle = segmentCenterAngleDeg(index, total);
            const rad = (angle * Math.PI) / 180;
            const left = 50 + Math.cos(rad) * LABEL_ANCHOR_RADIUS_PCT;
            const top = 50 + Math.sin(rad) * LABEL_ANCHOR_RADIUS_PCT;
            const isWinner = winner?.id === item.id;

            return (
              <div
                key={item.id}
                className={`${styles.segmentLabel} ${isWinner ? styles.segmentLabelWinner : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span className={styles.categoryPill}>{item.category}</span>
                <span className={styles.itemName}>{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.pointer} aria-hidden="true" />

      <button
        type="button"
        className={styles.goButton}
        onClick={onGoClick}
        disabled={goDisabled}
        aria-label="룰렛 돌리기"
      >
        Go
      </button>
    </div>
  );
}
